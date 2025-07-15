import React from "react";
import { useNavigate } from "react-router-dom";

export default function EmailVerified() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "80vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      color: "#fff"
    }}>
      <div style={{
        background: "rgba(255,255,255,0.95)",
        borderRadius: 20,
        boxShadow: "0 8px 32px rgba(249,115,22,0.15)",
        padding: "40px 32px",
        maxWidth: 400,
        textAlign: "center"
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: "#f97316", marginBottom: 12 }}>Email Verified!</h2>
        <p style={{ color: "#333", marginBottom: 24 }}>
          Your email has been successfully verified.<br />
          You can now log in to your account.
        </p>
        <button
          onClick={() => navigate("/login")}
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 50,
            padding: "12px 36px",
            fontSize: 18,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(249,115,22,0.15)"
          }}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
} 