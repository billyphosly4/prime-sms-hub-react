import Navbar from '../../Compound/Navbar';
import './Home.css';
export default function Home({ onNavigate }) {
  return (
    <section className="preloader">
      <Navbar onNavigate={onNavigate} />

      <main>
        <section className="hero container-wide">
          <div className="hero-inner">
            <div>
              <h1>Verify more for less with PrimeSmsHub</h1>
              <p>Protect your online identity by using our virtual phone numbers — reliable, affordable, and global.</p>
              <div className="hero-ctas">
                <button className="btn primary" onClick={() => (window.location.href = 'buy-numbers.html')}>
                  Buy Number
                </button>
                <button className="btn secondary" onClick={() => onNavigate && onNavigate('signup')}>
                  Create Account
                </button>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-panel">
                <img src="/hero.png" alt="PrimeSmsHub preview" />
              </div>
            </div>

            <div className="cards">
            <div className="card">
              <h3>Trusted Coverage</h3>
              <p>500+ countries and services supported.</p>
            </div>
            <div className="card">
              <h3>Low & Stable Prices</h3>
              <p>Transparent pricing starting at cents per request.</p>
            </div>
            <div className="card">
              <h3>Fast Delivery</h3>
              <p>Instant activation and delivery.</p>
            </div>
            <div className="card">
              <h3>Secure</h3>
              <p>Non-VoIP numbers compatible with most services.</p>
            </div>
          </div>
            </div>
        </section>

        <section className="white-card">
          <div className="blog-card">
            <h2>Over 500+ available countries & services</h2>
            <div className="cards">
              <h3>High quality Sms verifications</h3>
              <p>
                At PrimeSmsHub, we pride ourselves on providing the highest quality Sms verifications. We provide
                non-VoIP numbers to work with any service.
              </p>
            </div>
            <div className="cards">
              <h3>Hassle-free SMS Verfiication</h3>
              <p>Don't feel comfortable giving out your phone number? Protect your online identity by using our virtual phone numbers.</p>
            </div>
            <div className="cards">
              <h3>No Price Fluctuation</h3>
              <p>Our numbers start at 2 cents each, and our prices never fluctuate, even during high demand!</p>
            </div>
            <div className="cards">
              <h3>Efficiency</h3>
              <p>Don't feel comfortable giving out your phone number? Protect your online identity by using our virtual phone numbers.</p>
            </div>
          </div>
        </section>

        <section className="container">
          <div className="container-content">
            <h2>Get started for free</h2>
            <p>The service we offer is designed to meet your business needs.</p>
            <a className="btn success" href="/signup">
              Start for free
            </a>
            <div>
              <img src="/cont.webp" alt="" />
            </div>
          </div>
        </section>


 </main>
      <footer className="site-footer footer">
        <div className="footer-content">
          <div className="footer-grid">
            <div>
              <img src="/hero.png" alt="PrimeSmsHub" className="logo-footer" />
              <p className="footer-note">Trusted by 500+ clients. Secure virtual numbers worldwide.</p>
            </div>
          </div>
          <div className="footer-grid footer-links-row">
            <div>
              <h4>Quick Links</h4>
              <a href="/login">Login</a>
              <a href="/signup">Register</a>
              <a href="buy-numbers.html">Buy Number</a>
            </div>
            <div>
              <h4>Follow</h4>
              <a href="#" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                TikTok
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                Telegram
              </a>
            </div>
          </div>
          <div className="footer-grid">
            <div>
              <h4>Contact</h4>
              <div>Phone: +234 7048694977</div>
              <a href="mailto:support@primesmshub.com">support@primesmshub.com</a>
            </div>
          </div>

          <div className="footer-chat" aria-hidden="false">
            <button id="openChat" aria-haspopup="dialog" aria-controls="chatPanel" aria-expanded="false" title="Open chat">
              💬
            </button>

            <div id="chatPanel" className="modal" role="dialog" aria-hidden="true">
              <div className="modal-header">
                <div className="title">Telegram Support</div>
                <button id="closeChat" aria-label="Close chat">
                  ✖
                </button>
              </div>
              <div id="chatBox" className="modal-content"></div>
              <div className="input-row">
                <input id="messageInput" placeholder="Type a message" />
                <button id="sendBtn">Send</button>
              </div>
            </div>
          </div>
        </div>
      </footer>
     
    
      </section>
  );
  
}
