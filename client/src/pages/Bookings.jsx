import React from 'react'

function Bookings({place}) {
  return (
    <div>
  <h2 className="text-xl font-semibold mb-4">Your Bookings:</h2>
  <ul className="space-y-4">
    {place.map(booking => (
      <li key={booking._id} className="p-4 border rounded shadow-sm bg-white">
        <div className="mb-2"><span className="font-semibold">Place:</span> {booking.place.name}</div>
        <div className="mb-2"><span className="font-semibold">Check-In:</span> {new Date(booking.checkIn).toLocaleDateString()}</div>
        <div className="mb-2"><span className="font-semibold">Check-Out:</span> {new Date(booking.checkOut).toLocaleDateString()}</div>
        <div className="mb-2"><span className="font-semibold">Name:</span> {booking.name}</div>
        <div className="mb-2"><span className="font-semibold">Phone:</span> {booking.phone}</div>
        <div><span className="font-semibold">Price:</span> ${booking.price}</div>
      </li>
    ))}
  </ul>
</div>

  )
}

export default Bookings;
