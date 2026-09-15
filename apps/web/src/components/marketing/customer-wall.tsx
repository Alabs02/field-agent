import { ArrowRight, ChevronDown } from "lucide-react";
import { CUSTOMERS, type Customer } from "./content";

function Logos({ customers, eager = false }: { customers: Customer[]; eager?: boolean }) {
  return (
    <ul className="ea-logo-grid">
      {customers.map((customer) => (
        <li key={customer.slug} className="ea-logo-cell">
          <img
            src={`/ea/logos/${customer.slug}.png`}
            alt={customer.name}
            width={125}
            height={100}
            loading={eager ? "eager" : "lazy"}
          />
        </li>
      ))}
    </ul>
  );
}

export function CustomerWall() {
  return (
    <section className="ea-customers" id="customers" aria-labelledby="customers-heading">
      <div className="ea-customer-heading">
        <h2 id="customers-heading">In good company.</h2>
        <p>Trusted by some of the world’s most recognizable retailers.</p>
      </div>
      <Logos customers={CUSTOMERS.slice(0, 12)} eager />
      <div className="ea-customer-actions">
        <details className="ea-disclosure ea-customer-disclosure">
          <summary>
            <span className="ea-when-closed">View all customers</span>
            <span className="ea-when-open">Show fewer customers</span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <Logos customers={CUSTOMERS.slice(12)} />
        </details>
        <a href="#stories" className="ea-text-link ea-testimonial-link">
          Read testimonials <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
