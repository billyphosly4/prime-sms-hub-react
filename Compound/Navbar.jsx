export default function Navbar({ onNavigate }) {
  const handleLoginClick = () => {
    if (onNavigate) {
      onNavigate('login');
    } else {
      window.location.href = 'login.html';
    }
  };

  const handleSignupClick = () => {
    window.location.href = 'signup.html';
  };

  return (
    <header className="site-header header">
      <div className="container-wide navbar">
        <div className="brand">
          <img src="/hero.png" alt="PrimeSmsHub" />
          <div>
            <strong>PrimeSmsHub</strong>
            <div style={{ fontSize: '12px', color: '#667781' }}>
              Virtual numbers & SMS verification
            </div>
          </div>
        </div>
        <div className="nav-actions">
          <button
            className="btn secondary"
            id="openAuthSignup"
            onClick={handleSignupClick}
          >
            Sign up
          </button>
          <button
            className="btn primary"
            id="openAuthLogin"
            onClick={handleLoginClick}
          >
            Login / Buy
          </button>
        </div>
      </div>
    </header>
  );
}
