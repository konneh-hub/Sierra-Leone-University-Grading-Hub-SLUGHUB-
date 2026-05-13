function StatCard({ title, value, description, status }) {
  return (
    <div className="stat-card">
      <div className="stat-card-head">
        <h3>{title}</h3>
        {status ? <span className="stat-badge">{status}</span> : null}
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-description">{description}</p>
    </div>
  );
}

export default StatCard;
