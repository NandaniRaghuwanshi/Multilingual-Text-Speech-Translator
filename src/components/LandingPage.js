import React, { useState, useEffect } from "react";
import { Carousel } from "bootstrap"; // Import the Carousel component from Bootstrap
import "./LandingPage.css";
import 'bootstrap/dist/js/bootstrap.bundle.min.js';


const LandingPage = ({ onExplore }) => {
  const [imageStyles, setImageStyles] = useState({
    
  });

  useEffect(() => {
    // Initialize Bootstrap Carousel
    const carouselElement = document.getElementById('carouselExample');
    if (carouselElement) {
      new Carousel(carouselElement, {
        interval: 3000, 
        ride: 'carousel'
      });
    }

    // Handle responsive styles
    const handleResize = () => {
      
      
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call it once on mount

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div>


      <div className="hero-section" style={{ padding: "12px" }}>
        <h4> Speech & Text AI Application</h4>
        <div id="carouselExample" className="carousel slide" data-bs-ride="carousel">
          <div className="carousel-inner">
            <div className="carousel-item active">
              <p>It is an AI Poweered Translator.</p>
            </div>
            <div className="carousel-item">
              <p>Experience the Future: Transform speech into accurate text with our cutting-edge AI engine..</p>
            </div>
            <div className="carousel-item">
              <p>Lightning-Fast Processing: Enjoy rapid conversion and seamless integration across devices.</p>
            </div>
            <div className="carousel-item">
              <p>Enhanced Communication: Break language barriers and connect with diverse audiences worldwide</p>
            </div>
            <div className="carousel-item">
              <p>Smart & Scalable: Empower your projects with advanced analytics and real-time insights.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container card-container">
        <div className="card">
          <h5>Efficient Translation</h5>
          <p>Our translator leverages cutting-edge algorithms to deliver fast, accurate translations across a wide variety of languages. </p>
          <p>Designed with efficiency in mind, it minimizes delays while maximizing precision, ensuring your message is conveyed accurately no matter the complexity of the text.</p>
        </div>
        <div className="card">
          <h5>Seamless Communication</h5>
          <p>AI-Powered Language Translation for Communication – Converts documents, public announcements, and reports into multiple languages.</p>
          <p>Speech-to-Text for Digital Governance – Enables real-time transcription of official discussions, policy meetings, and conferences.</p>
          <p>Text-to-Speech for Public Accessibility – Reads out government circulars and notifications for visually impaired individuals.</p>
        </div>
        <div className="card">
          <h5>Global Reach</h5>
          <p>Reach audiences far and wide with our comprehensive language support. By providing reliable translations in over 10 Indian languages, we empower you to expand your communication horizons and engage with diverse cultures and communities seamlessly.</p>
          <p>Lecture Transcription & Audio Notes – Converts spoken lectures into text and creates audio-based learning materials.</p>
        </div>
      </div>

      <div className="container">
        <div className="row">
          <button className="explore-btn" onClick={onExplore} style={{ marginTop: "10px", width: "346px", fontSize: "16px" }}>
            Welcome to the AI powered translator
          </button>
        </div>
        <div>
          <footer className="footer" style={{ textAlign: "center", paddingBottom: "0px", paddingTop: "42px", fontSize: "14px" }}>
            <p style={{ color: "#888" }}>&copy; 2025</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
