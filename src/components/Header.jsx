import React from "react";

export default function Header({
  search = "",
  onSearchChange = () => {},
  view = "library",
  onSetView = () => {},
  isAdmin = false,
  onHamburgerClick = () => {},
}) {
  return (
    <header className='bf-header'>
      <div className='bf-leftCluster'>
        <button
          className='bf-hamburger'
          onClick={onHamburgerClick}
          aria-label='Open menu'
        >
          ☰
        </button>

        <div className='bf-logoGroup'>
          {/* small camera icon + text */}
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            className='bf-logoIcon'
            aria-hidden='true'
          >
            <path
              fill='currentColor'
              d='M17 10.5V7c0-.55-.45-1-1-1H4C3.45 6 3 6.45 3 7v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z'
            />
          </svg>
          <span className='bf-logoText'>Beechwood Films</span>
        </div>
      </div>

      <div className='bf-searchWrap'>
        <input
          type='text'
          className='bf-search'
          placeholder='Search'
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className='bf-searchIcon' aria-hidden='true'>
          🔍
        </span>
      </div>

      <div className='bf-actions'>
        <button
          className={`bf-navBtn ${view === "library" ? "is-active" : ""}`}
          onClick={() => onSetView("library")}
        >
          Library
        </button>
        <button
          className={`bf-navBtn ${view === "favorites" ? "is-active" : ""}`}
          onClick={() => onSetView("favorites")}
        >
          Favorites
        </button>
        {isAdmin && (
          <span style={{ fontSize: "0.8rem", opacity: 0.9 }}>Admin On</span>
        )}
      </div>
    </header>
  );
}
