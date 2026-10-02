import React, { useState, useEffect, useRef } from 'react';
import { Modal, Select, Tooltip } from 'antd';
import { 
  CloseOutlined, 
  MinusOutlined, 
  BorderOutlined, 
  ClearOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { executeCliCommand, CliCommandResult } from '../utils/cliNetworkEngine';

interface HistoryEntry {
  command: string;
  outputLines: string[];
  isStreaming?: boolean;
}

export const DeviceCliModal: React.FC = () => {
  const { 
    isCliModalOpen, 
    cliNodeId, 
    closeCliModal, 
    graph,
    sendDirectedPing 
  } = useGraphStore();

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(cliNodeId);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync currentNodeId with cliNodeId when modal opens
  useEffect(() => {
    if (cliNodeId && graph.nodes[cliNodeId]) {
      setCurrentNodeId(cliNodeId);
    } else if (!currentNodeId && Object.keys(graph.nodes).length > 0) {
      setCurrentNodeId(Object.keys(graph.nodes)[0]);
    }
  }, [cliNodeId, graph.nodes]);

  // Keep input focused when modal is active
  useEffect(() => {
    if (isCliModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isCliModalOpen, currentNodeId]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isStreaming]);

  const currentNode = currentNodeId ? graph.nodes[currentNodeId] : null;
  const currentIp = currentNode 
    ? ((currentNode.properties.ipAddress || currentNode.properties.lanIp || currentNode.properties.managementIp || '0.0.0.0') as string)
    : '0.0.0.0';

  const defaultGateway = currentNode 
    ? ((currentNode.properties.defaultGateway || currentNode.properties.gateway || '192.168.1.1') as string)
    : '192.168.1.1';

  // Handle command execution
  const runCommand = (cmdText: string) => {
    if (!currentNodeId || !cmdText.trim()) return;
    const trimmed = cmdText.trim();

    // Add to command history
    setCmdHistory(prev => [...prev.filter(c => c !== trimmed), trimmed]);
    setHistoryPointer(-1);
    setInputVal('');

    // Special case: cls / clear
    if (trimmed.toLowerCase() === 'cls' || trimmed.toLowerCase() === 'clear') {
      setHistory([]);
      return;
    }

    const result: CliCommandResult = executeCliCommand(graph, currentNodeId, trimmed);

    // If ping command and target resolved, trigger canvas packet animation too!
    if (result.targetNodeId && trimmed.toLowerCase().startsWith('ping')) {
      sendDirectedPing(currentNodeId, result.targetNodeId);
    }

    // Stream lines if steps exist, otherwise show all
    if (result.steps && result.steps.length > 0) {
      setIsStreaming(true);
      const entry: HistoryEntry = {
        command: trimmed,
        outputLines: [],
        isStreaming: true
      };
      setHistory(prev => [...prev, entry]);

      let accumulated: string[] = [];
      let stepIndex = 0;

      const streamNext = () => {
        if (stepIndex >= result.steps!.length) {
          setIsStreaming(false);
          setHistory(prev => {
            const next = [...prev];
            if (next.length > 0) {
              next[next.length - 1] = {
                command: trimmed,
                outputLines: accumulated,
                isStreaming: false
              };
            }
            return next;
          });
          return;
        }

        const step = result.steps![stepIndex];
        accumulated = [...accumulated, step.text];
        stepIndex++;

        setHistory(prev => {
          const next = [...prev];
          if (next.length > 0) {
            next[next.length - 1] = {
              command: trimmed,
              outputLines: accumulated,
              isStreaming: true
            };
          }
          return next;
        });

        setTimeout(streamNext, step.delayMs || 150);
      };

      streamNext();
    } else {
      setHistory(prev => [
        ...prev,
        {
          command: trimmed,
          outputLines: result.outputLines,
          isStreaming: false
        }
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isStreaming) {
        runCommand(inputVal);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextPtr = historyPointer === -1 ? cmdHistory.length - 1 : Math.max(0, historyPointer - 1);
      setHistoryPointer(nextPtr);
      setInputVal(cmdHistory[nextPtr] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyPointer === -1) return;
      const nextPtr = historyPointer + 1;
      if (nextPtr >= cmdHistory.length) {
        setHistoryPointer(-1);
        setInputVal('');
      } else {
        setHistoryPointer(nextPtr);
        setInputVal(cmdHistory[nextPtr] || '');
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C to cancel streaming or clear input
      setIsStreaming(false);
      setInputVal('');
      setHistory(prev => [
        ...prev,
        { command: inputVal + '^C', outputLines: [], isStreaming: false }
      ]);
    }
  };

  // Find other nodes in the network to suggest ping targets
  const otherNodes = Object.values(graph.nodes).filter(n => n.id !== currentNodeId);
  const sampleTarget = otherNodes[0];
  const sampleTargetIp = sampleTarget 
    ? ((sampleTarget.properties.ipAddress || sampleTarget.properties.lanIp || '192.168.1.101') as string)
    : '192.168.1.1';

  return (
    <Modal
      open={isCliModalOpen}
      onCancel={closeCliModal}
      footer={null}
      closable={false}
      width={isMaximized ? '96vw' : 840}
      style={{ top: isMaximized ? 20 : 60, padding: 0 }}
      styles={{
        content: {
          padding: 0,
          backgroundColor: '#0c0c0c',
          borderRadius: 8,
          border: '1px solid #334155',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }
      }}
    >
      {/* Authentic Windows Command Prompt Titlebar */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1f1f1f',
          borderBottom: '1px solid #333333',
          padding: '6px 10px',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Windows CMD Icon */}
          <div 
            style={{
              width: 18,
              height: 18,
              backgroundColor: '#000000',
              border: '1px solid #666666',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#ffffff',
              fontFamily: 'Consolas, monospace'
            }}
          >
            &gt;_
          </div>

          <span style={{ fontSize: 12, fontWeight: 500, color: '#e5e7eb', fontFamily: 'Segoe UI, sans-serif' }}>
            Administrator: Command Prompt — {currentNode?.tag || currentNode?.name || 'Device'} ({currentIp})
          </span>
        </div>

        {/* Device Switcher and Window Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>Host:</span>
            <Select
              size="small"
              value={currentNodeId || undefined}
              onChange={(val) => {
                setCurrentNodeId(val);
                setHistory([]);
              }}
              style={{ width: 170 }}
              popupMatchSelectWidth={false}
              options={Object.values(graph.nodes).map(n => ({
                label: `${n.tag} (${(n.properties.ipAddress || n.properties.lanIp || 'No IP') as string})`,
                value: n.id
              }))}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 3
              }}
              title="Maximize / Restore"
            >
              {isMaximized ? <MinusOutlined style={{ fontSize: 11 }} /> : <BorderOutlined style={{ fontSize: 11 }} />}
            </button>
            <button
              onClick={closeCliModal}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 3
              }}
              title="Close CMD"
            >
              <CloseOutlined style={{ fontSize: 12 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          height: isMaximized ? 'calc(80vh - 120px)' : 420,
          backgroundColor: '#0c0c0c',
          padding: '14px 16px',
          overflowY: 'auto',
          fontFamily: "'Consolas', 'Lucida Console', 'Courier New', monospace",
          fontSize: 13,
          lineHeight: '1.45',
          color: '#cccccc',
          cursor: 'text'
        }}
      >
        {/* Authentic Windows OS Banner */}
        <div style={{ color: '#cccccc', marginBottom: 12 }}>
          Microsoft Windows [Version 10.0.22631.3296]<br />
          (c) Microsoft Corporation. All rights reserved.<br />
          <span style={{ color: '#64748b', fontSize: 11 }}>
            [OmniFlow Network Diagnostic Subsystem: Active on Node &apos;{currentNode?.name}&apos;]
          </span>
        </div>

        {/* Command Output History */}
        {history.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            {/* Prompt line */}
            <div style={{ color: '#f1f1f1' }}>
              <span>C:\Users\Administrator&gt;</span>
              <span style={{ color: '#38bdf8', fontWeight: 600, marginLeft: 6 }}>{item.command}</span>
            </div>

            {/* Output lines */}
            <div style={{ marginTop: 4 }}>
              {item.outputLines.map((line, lIdx) => {
                let color = '#cccccc';
                // Highlight packet lines
                if (line.includes('Reply from')) {
                  if (line.includes('bytes=')) {
                    color = '#34d399'; // Green reply
                  } else if (line.includes('unreachable')) {
                    color = '#f87171'; // Red unreachable
                  }
                } else if (line.includes('timed out') || line.includes('Lost = 4 (100% loss)')) {
                  color = '#f87171'; // Red timeout
                } else if (line.startsWith('Windows IP Configuration') || line.startsWith('Active Connections')) {
                  color = '#38bdf8'; // Cyan header
                } else if (line.includes('IPv4 Address') || line.includes('Subnet Mask') || line.includes('Default Gateway')) {
                  color = '#f8fafc'; // Crisp white
                } else if (line.includes('WARNING:')) {
                  color = '#facc15'; // Amber warning
                }

                return (
                  <div key={lIdx} style={{ color, whiteSpace: 'pre-wrap' }}>
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Active Command Prompt Line */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#f1f1f1', whiteSpace: 'nowrap' }}>
            C:\Users\Administrator&gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#38bdf8',
              fontFamily: "'Consolas', 'Lucida Console', 'Courier New', monospace",
              fontSize: 13,
              marginLeft: 6,
              caretColor: '#ffffff'
            }}
            placeholder={isStreaming ? 'Transmitting packets...' : 'Type ping, ipconfig, ifconfig, tracert, arp -a, help...'}
          />
        </div>

        <div ref={terminalEndRef} />
      </div>

      {/* Quick Diagnostics Action Bar */}
      <div
        style={{
          backgroundColor: '#141414',
          borderTop: '1px solid #262626',
          padding: '8px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginRight: 2 }}>QUICK CMD:</span>
          
          <button
            onClick={() => runCommand(`ping ${sampleTargetIp}`)}
            disabled={isStreaming}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#38bdf8',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'Consolas, monospace',
              cursor: isStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            ping {sampleTargetIp}
          </button>

          <button
            onClick={() => runCommand(`ping ${defaultGateway}`)}
            disabled={isStreaming}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#38bdf8',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'Consolas, monospace',
              cursor: isStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            ping Gateway ({defaultGateway})
          </button>

          <button
            onClick={() => runCommand('ipconfig')}
            disabled={isStreaming}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#a78bfa',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'Consolas, monospace',
              cursor: isStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            ipconfig
          </button>

          <button
            onClick={() => runCommand('ipconfig /all')}
            disabled={isStreaming}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#a78bfa',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'Consolas, monospace',
              cursor: isStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            ipconfig /all
          </button>

          <button
            onClick={() => runCommand('ifconfig')}
            disabled={isStreaming}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#34d399',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'Consolas, monospace',
              cursor: isStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            ifconfig
          </button>

          <button
            onClick={() => runCommand(`tracert ${sampleTargetIp}`)}
            disabled={isStreaming}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#fbbf24',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'Consolas, monospace',
              cursor: isStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            tracert {sampleTargetIp}
          </button>

          <button
            onClick={() => runCommand('arp -a')}
            disabled={isStreaming}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'Consolas, monospace',
              cursor: isStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            arp -a
          </button>

          <button
            onClick={() => runCommand('netstat')}
            disabled={isStreaming}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 11,
              fontFamily: 'Consolas, monospace',
              cursor: isStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            netstat
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tooltip title="Clear Screen (CLS)">
            <button
              onClick={() => runCommand('cls')}
              style={{
                background: '#1f2937',
                border: '1px solid #374151',
                color: '#9ca3af',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              <ClearOutlined /> cls
            </button>
          </Tooltip>
        </div>
      </div>
    </Modal>
  );
};
