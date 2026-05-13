import './Sidebar.css';

function Sidebar({ pages, activePage, onSelectPage }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">SA</div>
        <div>
          <h1>System Admin</h1>
          <p>Platform dashboard</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {pages.map((page) => (
          <button
            key={page.key}
            className={`sidebar-link ${activePage === page.key ? 'active' : ''}`}
            type="button"
            onClick={() => onSelectPage(page.key)}
          >
            {page.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
