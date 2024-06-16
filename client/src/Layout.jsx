import Header from "./Header";
import {Outlet} from "react-router-dom";
import IndexPage from "./pages/IndexPage";

export default function Layout() {
  return (
    
    <div className="py-4 px-8 flex flex-col min-h-screen max-w-4xl mx-auto">
      <Header />
      <Outlet />
    </div>
  );
}
