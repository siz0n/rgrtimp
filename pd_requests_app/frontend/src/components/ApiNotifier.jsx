import { useEffect, useState } from "react";

export default function ApiNotifier() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timeoutId;

    function handleForbidden(event) {
      setMessage(event.detail || "Недостаточно прав");
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setMessage(""), 4000);
    }

    window.addEventListener("api:forbidden", handleForbidden);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("api:forbidden", handleForbidden);
    };
  }, []);

  if (!message) return null;

  return <div className="global-api-alert">{message}</div>;
}
