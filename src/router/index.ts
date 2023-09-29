// Composables
import {
  createRouter,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";

const routes = [
  {
    path: "/",
    component: () => import("@/layouts/default/Default.vue"),
    children: [
      {
        path: "",
        name: "MainPage",
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () =>
          import(/* webpackChunkName: "home" */ "@/views/main/MainPage.vue"),
      },
    ],
  },
];

// const router = createRouter({
//   history: createWebHistory(process.env.BASE_URL),
//   routes,
// });

// export default router;

const router = createRouter({
  history: createWebHashHistory(),
  linkActiveClass: "active",
  routes,
});
export default router;

// console.log(process.env.BASE_URL);

// const router = createRouter({
//   history: createWebHistory(),
//   routes,
// });

// export default router;
