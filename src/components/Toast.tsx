export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="app-toast" role="status">
      {message}
    </p>
  );
}
