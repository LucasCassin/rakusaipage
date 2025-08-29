/**
 * Calcula a diferença em dias entre duas datas, ignorando a hora.
 * Retorna um número positivo se a data do evento for no futuro.
 */
export function getDaysUntilEvent(eventDateString) {
  const today = new Date();
  const eventDate = new Date(eventDateString);

  // Zera a hora de ambas as datas para comparar apenas os dias
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);

  const diffTime = eventDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
