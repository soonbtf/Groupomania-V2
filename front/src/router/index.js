import { createRouter, createWebHashHistory } from "vue-router";
import Login from "@/views/LoginView.vue";
import News from "@/views/NewsFeedView.vue";
import Signup from "@/views/SignupView.vue";
import ViewPost from "@/views/ViewPost.vue";
import ProfilPage from "@/views/ProfilView.vue";
import UsersList from "@/views/UsersListView.vue";

const routes = [
  {
    path: "/",
    redirect: "/login",
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },
  {
    path: "/signup",
    name: "Signup",
    component: Signup,
  },
  {
    path: "/news",
    name: "News",
    component: News,
    children: [
      {
        path: ":id",
        name: "ViewPost",
        component: ViewPost,
      },
    ],
    beforeEnter: (_, _2, next) => {
      window.sessionStorage.getItem("user") ? next() : next("/login");
    },
  },
  {
    path: "/users",
    name: "User",
    component: UsersList,
  },
  {
    path: "/users/:username",
    name: "UserProfil",
    component: ProfilPage,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
