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
  const [trackBusy, setTrackBusy] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function trackShipment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trackingNumber = tracking.trim();
    if (!trackingNumber) { setTrackMessage("Enter a tracking number to continue."); return; }
    setTrackBusy(true);
    setTrackMessage("");
    try {
      const response = await fetch("/api/tracking?trackingNumber=" + encodeURIComponent(trackingNumber), { cache: "no-store" });
      const result = await response.json() as { tracking?: { status?: string; carrier?: string | null; origin?: string | null; destination?: string | null; estimatedDelivery?: string | null; source?: string }; error?: string };
      if (!response.ok || !result.tracking) {
        setTrackMessage(response.status === 404
          ? "No shipment was found for that tracking number. Check it and try again. External carrier tracking is not connected yet."
          : result.error ?? "Tracking is temporarily unavailable. Please try again later.");
        return;
      }
      const item = result.tracking;
      const route = item.origin && item.destination ? ` Route: ${item.origin} → ${item.destination}.` : "";
      const eta = item.estimatedDelivery ? ` Estimated delivery: ${new Date(item.estimatedDelivery).toLocaleDateString()}.` : "";
      const source = item.source === "mock" ? " This is demo data, not a live carrier update." : "";
      setTrackMessage(`Status: ${(item.status ?? "UNKNOWN").replaceAll("_", " ")}.${item.carrier ? ` Carrier: ${item.carrier}.` : ""}${route}${eta}${source}`);
    } catch {
      setTrackMessage("Tracking is temporarily unavailable. Please try again later.");
    } finally {
      setTrackBusy(false);
    }
  }

  async function requestQuote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setQuoteMessage("");
    setQuoteSent(false);
    setQuoteBusy(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { ok?: boolean; requestId?: string | null; error?: string; fields?: Record<string, string[]> };
      if (!response.ok || !result.ok) {
        setQuoteMessage(result.error ?? "We could not submit your request. Please review the fields and try again.");
        return;
      }
      setQuoteSent(true);
      setQuoteMessage(result.requestId
        ? `Your request was saved. Reference: ${result.requestId}. This is a request for review, not a confirmed quote or booking.`
        : "Your request could not be stored. Please contact support.");
      if (result.requestId) form.reset();
    } catch {
      setQuoteMessage("We could not reach the quote service. No confirmation was received; please try again later.");
    } finally {
      setQuoteBusy(false);
    }
  }

  return <main>
    <header className="nav">
      <a className="brand" href="#" aria-label="NELTRIX I.S. Global home">
        <span className="brand-mark">N</span><span className="brand-copy"><strong>NELTRIX</strong><small>I.S. Global</small></span>
        <span className="brand-sub">INTERNATIONAL<br/>SHIPPING</span>
      </a>
      <nav id="primary-navigation" className={mobileMenuOpen ? "nav-links nav-open" : "nav-links"}><a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a><a href="#services" onClick={() => setMobileMenuOpen(false)}>Services</a><a href="#track" onClick={() => setMobileMenuOpen(false)}>Track Shipment</a><a href="#about" onClick={() => setMobileMenuOpen(false)}>About Us</a><a href="#quote" onClick={() => setMobileMenuOpen(false)}>Get a Quote</a></nav>
      <a className="nav-cta" href="#quote" onClick={(event) => { event.preventDefault(); document.getElementById("quote")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Request a quote <ArrowRight size={16}/></a>
      <button className="mobile-menu" type="button" aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileMenuOpen} aria-controls="primary-navigation" onClick={() => setMobileMenuOpen((open) => !open)}><Menu/></button>
    </header>

    <section className="hero" id="home">
      <div className="hero-shade"/>
      <div className="hero-content">
        <div className="eyebrow"><span/> INTERNATIONAL SHIPPING & LOGISTICS</div>
        <h1>Global shipping.<br/><em>Simplified.</em></h1>
        <p>Fast. Secure. Reliable. From your door to destinations around the world, we help move what matters.</p>
        <div className="hero-actions"><a className="button primary" href="#quote" onClick={(event) => { event.preventDefault(); document.getElementById("quote")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Get shipping quote <ArrowRight size={18}/></a><a className="button ghost" href="#track"><MapPin size={17}/> Track a shipment</a></div>
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
        <button className="button primary" type="submit" disabled={trackBusy}>{trackBusy ? "Checking…" : "Track"} <ArrowRight size={17}/></button>
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
        <div className="form-row">
          <label>Full name<input name="fullName" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your name" /></label>
          <label>Email address<input name="email" autoComplete="email" required type="email" maxLength={254} placeholder="you@company.com" /></label>
        </div>
        <label>Phone (optional)<input name="phone" autoComplete="tel" type="tel" maxLength={40} placeholder="Phone number with country code" /></label>
        <div className="form-row">
          <label>Origin country<select name="originCountry" defaultValue="" required><option value="" disabled>Select origin</option><option value="Brazil">Brazil</option><option value="United States">United States</option></select></label>
          <label>Destination country<select name="destinationCountry" defaultValue="" required><option value="" disabled>Select destination</option><option value="Brazil">Brazil</option><option value="United States">United States</option></select></label>
        </div>
        <label>What are you shipping?<select name="shipmentType" defaultValue="" required><option value="" disabled>Select shipment type</option><option>Documents or parcel</option><option>Commercial cargo</option><option>Air freight</option><option>Ocean freight</option><option>Not sure yet</option></select></label>
        <label>Shipment details (optional)<textarea name="details" rows={4} maxLength={2000} placeholder="General description, approximate size/weight, or timing. Do not include payment details or sensitive personal information." /></label>
        <div className="quote-honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <p className="quote-privacy">Submitting sends your contact details to NELTRIX for quote follow-up. Do not submit sensitive personal data. Privacy and retention policies must be published before public launch.</p>
        <button className="button primary" type="submit" disabled={quoteBusy}>{quoteBusy ? "Submitting securely…" : "Submit quote request"} <ArrowRight size={17}/></button>
        {quoteMessage && <p className={quoteSent ? "notice success-notice" : "notice"} role="status">{quoteMessage}</p>}
      </form>
    </section>

    <footer><a className="brand footer-brand" href="#home"><span className="brand-mark">N</span><span className="brand-copy"><strong>NELTRIX</strong><small>I.S. Global</small></span></a><p>International Shipping · Freight · Logistics</p><span>© {new Date().getFullYear()} NELTRIX I.S. Global. Working brand name; legal clearance pending.</span></footer>
  </main>;
}
