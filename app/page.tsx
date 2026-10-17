 "use client";

import { useState } from "react";
import { ArrowRight, Globe2, ShieldCheck, Clock3, Headphones, Package, Plane, Ship, Truck, MapPin, Menu } from "lucide-react";

const services = [
  { icon: Package, title: "Express Delivery", copy: "Fast, reliable delivery for documents and smaller packages." },
  { icon: Plane, title: "Air Freight", copy: "Time-sensitive international shipments with partner carriers." },
  { icon: Ship, title: "Ocean Freight", copy: "Flexible options for larger and commercial consignments." },
  { icon: Truck, title: "Land Transport", copy: "Road delivery through our team and trusted local partners." },
];

export default function Home() {
  const [tracking, setTracking] = useState("");
  const [trackMessage, setTrackMessage] = useState("");
  const [quoteSent, setQuoteSent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function trackShipment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tracking.trim()) { setTrackMessage("Enter a tracking number to continue."); return; }
    setTrackMessage("Live tracking is not connected yet. No shipment lookup was performed. Connect a carrier API before using this service.");
  }

  function requestQuote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setQuoteSent(true);
  }

  return <main>
    <header className="nav">
      <a className="brand" href="#" aria-label="NELTRIX I.S. Global home">
        <span className="brand-mark">N</span><span className="brand-copy"><strong>NELTRIX</strong><small>I.S. Global</small></span>
        <span className="brand-sub">INTERNATIONAL<br/>SHIPPING</span>
      </a>
      <nav id="primary-navigation" className={mobileMenuOpen ? "nav-links nav-open" : "nav-links"}><a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a><a href="#services" onClick={() => setMobileMenuOpen(false)}>Services</a><a href="#track" onClick={() => setMobileMenuOpen(false)}>Track Shipment</a><a href="#about" onClick={() => setMobileMenuOpen(false)}>About Us</a><a href="#quote" onClick={() => setMobileMenuOpen(false)}>Get a Quote</a></nav>
      <a className="nav-cta" href="#quote">Request a quote <ArrowRight size={16}/></a>
      <button className="mobile-menu" type="button" aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileMenuOpen} aria-controls="primary-navigation" onClick={() => setMobileMenuOpen((open) => !open)}><Menu/></button>
    </header>

    <section className="hero" id="home">
      <div className="hero-shade"/>
      <div className="hero-content">
        <div className="eyebrow"><span/> INTERNATIONAL SHIPPING & LOGISTICS</div>
        <h1>Global shipping.<br/><em>Simplified.</em></h1>
        <p>Fast. Secure. Reliable. From your door to destinations around the world, we help move what matters.</p>
        <div className="hero-actions"><a className="button primary" href="#quote">Get shipping quote <ArrowRight size={18}/></a><a className="button ghost" href="#track"><MapPin size={17}/> Track a shipment</a></div>
        <div className="hero-note"><ShieldCheck size={17}/> A customer-first logistics network built around clarity and care.</div>
      </div>
      <div className="hero-stats">
        <div><Globe2/><span><b>Brazil ↔ United States</b><small>Initial corridor focus</small></span></div>
        <div><ShieldCheck/><span><b>Secure handling</b><small>Care at every step</small></span></div>
        <div><Clock3/><span><b>Shipment visibility</b><small>Tracking integrations coming next</small></span></div>
        <div><Headphones/><span><b>Human support</b><small>Help when you need it</small></span></div>
      </div>
    </section>

    <section className="track-section" id="track">
      <div className="track-heading"><div className="track-icon"><Package/></div><div><h2>Track your shipment</h2><p>Tracking will be available after verified carrier integration is connected.</p></div></div>
      <form className="track-form" onSubmit={trackShipment}>
        <label className="sr-only" htmlFor="tracking">Tracking number</label><input id="tracking" value={tracking} onChange={e=>{setTracking(e.target.value);setTrackMessage("");}} placeholder="Enter tracking number" />
        <button className="button primary" type="submit">Track <ArrowRight size={17}/></button>
      </form>
      {trackMessage && <p className="notice" role="status">{trackMessage}</p>}
    </section>

    <section className="services section" id="services">
      <div className="section-intro"><div className="eyebrow dark">OUR SERVICES</div><h2>Shipping solutions<br/>for a connected world.</h2><p>Whether you’re sending a personal parcel or coordinating commercial freight, we’re building flexible shipping options for your needs.</p><a className="text-link" href="#quote">Discuss your shipment <ArrowRight size={16}/></a></div>
      <div className="service-grid">{services.map(({icon:Icon,title,copy})=><article className="service-card" key={title}><div className="service-icon"><Icon/></div><h3>{title}</h3><p>{copy}</p><a href="#quote" aria-label={`Ask about ${title}`}><ArrowRight size={18}/></a></article>)}</div>
    </section>

    <section className="about section" id="about">
      <div className="world-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="world-dot dot-one"/><div className="world-dot dot-two"/><div className="world-dot dot-three"/><Globe2 size={180} strokeWidth={0.6}/></div>
      <div className="about-copy"><div className="eyebrow">OUR REACH</div><h2>Connecting businesses<br/>across borders.</h2><p>Our initial launch focus is the Brazil–United States corridor in both directions. Service will be activated only when carrier coverage, customs processes, pricing, and operating requirements have been verified.</p><div className="regions"><span>🇧🇷 Brazil</span><span>↔</span><span>🇺🇸 United States</span></div></div>
      <div className="commitment"><ShieldCheck size={34}/><h3>Your shipment.<br/>Our commitment.</h3><p>Clear communication, responsible handling, and dependable service are the standards we’re working toward.</p></div>
    </section>

    <section className="quote-section section" id="quote">
      <div><div className="eyebrow dark">LET’S GET MOVING</div><h2>Tell us what you need to ship.</h2><p>Share your shipment details and prepare a request for the NELTRIX team.</p></div>
      <form className="quote-form" onSubmit={requestQuote}>
        <div className="form-row"><label>Full name<input required placeholder="Your name" /></label><label>Email address<input required type="email" placeholder="you@company.com" /></label></div>
        <div className="form-row"><label>Origin country<input required placeholder="e.g. Brazil" /></label><label>Destination country<input required placeholder="e.g. United States" /></label></div>
        <label>What are you shipping?<select defaultValue="" required><option value="" disabled>Select shipment type</option><option>Documents or parcel</option><option>Commercial cargo</option><option>Air freight</option><option>Ocean freight</option><option>Not sure yet</option></select></label>
        <button className="button primary" type="submit">Prepare quote request <ArrowRight size={17}/></button>
        {quoteSent && <p className="notice">This form is a front-end prototype only. Your details have not been sent or saved. Connect a secure backend before accepting real customer requests.</p>}
      </form>
    </section>

    <footer><a className="brand footer-brand" href="#home"><span className="brand-mark">N</span><span className="brand-copy"><strong>NELTRIX</strong><small>I.S. Global</small></span></a><p>International Shipping · Freight · Logistics</p><span>© {new Date().getFullYear()} NELTRIX I.S. Global. Working brand name; legal clearance pending.</span></footer>
  </main>;
}
