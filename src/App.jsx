import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FactoryLayout from './pages/FactoryLayout';
import Add from './pages/Add';
import Items from './pages/Items';
import Movements from './pages/Movements';
import Settings from './pages/Settings';


function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Layout Route */}
            <Route
              element={
                <PrivateRoute>
                  <Layout>
                    <Outlet />
                  </Layout>
                </PrivateRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/layout" element={<FactoryLayout />} />
              <Route path="/add" element={<Add />} />
              <Route path="/items" element={<Items />} />
              <Route path="/movements" element={<Movements />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
