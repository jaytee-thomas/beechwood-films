import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "../components/Header.jsx";
import useAdminPanel from "../store/useAdminPanel.js";
import useAuth from "../store/useAuth.js";

describe("Header", () => {
  beforeEach(() => {
    useAuth.getState().clearSession();
    useAdminPanel.setState({ showAuth: false, authView: "login" });
  });

  it("shows sign in and join when logged out", () => {
    render(
      <MemoryRouter>
        <Header search="" setSearch={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();
  });

  it("shows upload button for admin", () => {
    useAuth.setState({
      token: "abc",
      user: { id: "admin", role: "admin", name: "Admin" },
      status: "authenticated",
      error: null,
    });

    render(
      <MemoryRouter>
        <Header search="" setSearch={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /add new video/i })).toBeInTheDocument();
  });
});
