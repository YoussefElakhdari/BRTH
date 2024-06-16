import {useContext, useEffect, useState} from "react";
import {UserContext} from "../UserContext.jsx";
import {Link, Navigate, useParams} from "react-router-dom";
import axios from "axios";
import PlacesPage from "./PlacesPage";
import AccountNav from "../AccountNav";
import server from "../server.js";
import Bookings from "./Bookings.jsx";

export default function ProfilePage() {
  const [redirect,setRedirect] = useState(null);
  const [place,setPlace] = useState([]);
  const {ready,user,setUser} = useContext(UserContext);
  let {subpage} = useParams();
  if (subpage === undefined) {
    subpage = 'profile';
  }
  useEffect(()=>{
    axios.get(`${server}/bookings`).then(response => {
      setPlace(response.data);
      console.log(response.data);
    });
  },[])
  
  async function logout() {
    await axios.post(`${server}/logout`);
    setRedirect('/');
    setUser(null);
  }

  if (!ready) {
    return 'Loading...';
  }

  if (ready && !user && !redirect) {
    return <Navigate to={'/login'} />
  }

  if (redirect) {
    return <Navigate to={redirect} />
  }
  return (
    <div>
      <AccountNav />
      <Bookings place={place}/>
      {subpage === 'profile' && (
        <div className="text-center max-w-lg mx-auto">
          Logged in as {user.name} ({user.email})<br />
          <button onClick={logout} className="primary max-w-sm mt-2">Logout</button>
        </div>
      )}
      {subpage === 'places' && (
        <PlacesPage />
      )}
    </div>
  );
}