import Dashboard from "views/Dashboard.js";
import ClipQueue from "views/ClipQueue.js";
import Schedule from "views/Schedule.js";
import Analytics from "views/Analytics.js";
import UserProfile from "views/UserProfile.js";

var routes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: "tim-icons icon-chart-pie-36",
    component: <Dashboard />,
    layout: "/admin",
  },
  {
    path: "/clip-queue",
    name: "Clip Queue",
    icon: "tim-icons icon-scissors",
    component: <ClipQueue />,
    layout: "/admin",
  },
  {
    path: "/schedule",
    name: "Schedule",
    icon: "tim-icons icon-calendar-60",
    component: <Schedule />,
    layout: "/admin",
  },
  {
    path: "/analytics",
    name: "Analytics",
    icon: "tim-icons icon-sound-wave",
    component: <Analytics />,
    layout: "/admin",
  },
  {
    path: "/settings",
    name: "Settings",
    icon: "tim-icons icon-settings-gear-63",
    component: <UserProfile />,
    layout: "/admin",
  },
];

export default routes;
