import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { TopNav } from './components/TopNav';
import { Palette } from './components/Palette';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { ValidationDrawer } from './components/ValidationDrawer';
import { BOQModal } from './components/BOQModal';
import { CableScheduleModal } from './components/CableScheduleModal';
import { useGraphStore } from './store/graphStore';
export const App = () => {
    const { isSimulating, simulationSpeed, tickSimulation, loadDemoTopology } = useGraphStore();
    // Load baseline demonstration topology on first mount
    useEffect(() => {
        loadDemoTopology();
    }, [loadDemoTopology]);
    // Simulation tick loop
    useEffect(() => {
        if (!isSimulating)
            return;
        const interval = Math.max(20, Math.round(120 / simulationSpeed));
        const timer = setInterval(() => {
            tickSimulation();
        }, interval);
        return () => clearInterval(timer);
    }, [isSimulating, simulationSpeed, tickSimulation]);
    return (_jsx(ConfigProvider, { theme: {
            algorithm: theme.darkAlgorithm,
            token: {
                colorPrimary: '#0284c7',
                colorBgBase: '#0b111e',
                colorBgContainer: '#0f172a',
                colorBorder: '#334155',
                colorTextBase: '#f8fafc',
                borderRadius: 6,
                fontFamily: "'Inter', -apple-system, sans-serif"
            }
        }, children: _jsxs("div", { style: {
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#0b111e',
                overflow: 'hidden'
            }, children: [_jsx(TopNav, {}), _jsxs("div", { style: { flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }, children: [_jsx(Palette, {}), _jsx("div", { style: { flex: 1, position: 'relative', height: '100%' }, children: _jsx(Canvas, {}) }), _jsx(Inspector, {})] }), _jsx(StatusBar, {}), _jsx(ValidationDrawer, {}), _jsx(BOQModal, {}), _jsx(CableScheduleModal, {})] }) }));
};
export default App;
//# sourceMappingURL=App.js.map