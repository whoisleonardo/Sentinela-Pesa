import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Suppliers } from './pages/Suppliers';
import { SupplierDetail } from './pages/SupplierDetail';
import { Compare } from './pages/Compare';
import { Graph } from './pages/Graph';
import { Pricing } from './pages/Pricing';
import { AlertsPage } from './pages/Alerts';
import { useAlertStream } from './hooks/useAlertStream';

export default function App() {
  const { connected } = useAlertStream();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout connected={connected} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fornecedores" element={<Suppliers />} />
          <Route path="/fornecedores/:id" element={<SupplierDetail />} />
          <Route path="/comparativo" element={<Compare />} />
          <Route path="/grafo" element={<Graph />} />
          <Route path="/precificacao" element={<Pricing />} />
          <Route path="/alertas" element={<AlertsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
