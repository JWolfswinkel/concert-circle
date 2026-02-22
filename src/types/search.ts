export interface ConcertResult {
  id: number
  title: string
  artist: string
  location: string
  date: string
  time: string
  ticketUrl: string
  sourceUrl: string
  genres: string
  price: number | null
  soldOut: boolean
  canceled: boolean
}
