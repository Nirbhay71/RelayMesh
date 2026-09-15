import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import { useAuth } from './context/AuthContext';
import SplashReveal from './components/SplashReveal';

function App() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen" style={{ background: '#050505' }}>
      {/* 
        SplashReveal handles its own unmount after fading out.
        It stays on screen covering everything while loading is true,
        and then crossfades into the app once loading completes. 
      */}
      <SplashReveal isLoading={loading} />

      {/* Render the actual app routes only after loading is complete 
          so that Navigate redirects don't happen prematurely. */}
      {!loading && (
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={
            user ? <Home /> : <Navigate to="/login" />
          } />
        </Routes>
      )}
    </main>
  );
}

export default App;
