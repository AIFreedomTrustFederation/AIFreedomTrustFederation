export function reactComponentTemplate({ name, title, description }) {
  return `export function ${name}() {
  return (
    <section className="panel">
      <h2>${title}</h2>
      <p className="muted">${description}</p>
    </section>
  );
}
`;
}
