import React from "react";
import { Link } from "react-router-dom";
import "./CTAButton.css";

export default function CTAButton({ 
  variant = "primary", 
  children, 
  href, 
  onClick,
  className = "",
  ...props 
}) {
  const baseClass = `cta-button cta-button--${variant}`;
  const combinedClass = className ? `${baseClass} ${className}` : baseClass;

  if (href) {
    // External link
    if (href.startsWith("http")) {
      return (
        <a
          href={href}
          className={combinedClass}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }
    // Internal link
    return (
      <Link to={href} className={combinedClass} {...props}>
        {children}
      </Link>
    );
  }

  // Button
  return (
    <button
      type="button"
      onClick={onClick}
      className={combinedClass}
      {...props}
    >
      {children}
    </button>
  );
}

