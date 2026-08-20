/** Time-of-day greeting for dashboard headers (UI only). */
export function getDashboardGreeting(name) {
  const hour = new Date().getHours();
  let hello = "Hello";
  if (hour < 12) hello = "Good morning";
  else if (hour < 17) hello = "Good afternoon";
  else hello = "Good evening";

  const short = (name || "").trim().split(/\s+/)[0];
  return short ? `${hello}, ${short}` : hello;
}
