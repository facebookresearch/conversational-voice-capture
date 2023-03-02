export default function roomUrlToSessionID(roomUrl: string) {
  const tokens = roomUrl.split("/");
  return tokens[tokens.length - 1];
}
