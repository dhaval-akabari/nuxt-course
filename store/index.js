import Cookie from "js-cookie";

export const state = () => ({
  loadedPosts: [],
  token: null,
});

export const mutations = {
  setPosts(state, posts) {
    state.loadedPosts = posts;
  },
  addPost(state, post) {
    state.loadedPosts.push(post);
  },
  editPost(state, editedPost) {
    const postIndex = state.loadedPosts.findIndex(
      (post) => post.id === editedPost.id
    );
    state.loadedPosts[postIndex] = editedPost;
  },
  setToken(state, token) {
    state.token = token;
  },
  clearToken(state) {
    state.token = null;
  },
};

export const actions = {
  nuxtServerInit(vuexContext, context) {
    return context.app.$axios
      .$get("/posts.json")
      .then((data) => {
        const postsArray = [];
        for (const key in data) {
          postsArray.push({ ...data[key], id: key });
        }
        vuexContext.commit("setPosts", postsArray);
      })
      .catch((e) => {
        console.log(e);
      });
  },
  setPosts(context, posts) {
    context.commit("setPosts", posts);
  },
  addPost(context, post) {
    const createdPost = { ...post, updatedDate: new Date() };
    return this.$axios
      .$post(`/posts.json?auth=${context.state.token}`, createdPost)
      .then((res) => {
        context.commit("addPost", { ...createdPost, id: res.name });
      })
      .catch((e) => {
        console.log(e);
      });
  },
  editPost(context, editedPost) {
    const updatedPost = { ...editedPost, updatedDate: new Date() };
    return this.$axios
      .$put(
        `/posts/${editedPost.id}.json?auth=${context.state.token}`,
        updatedPost
      )
      .then((res) => {
        context.commit("editPost", updatedPost);
      })
      .catch((e) => {
        console.log(e);
      });
  },
  authenticateUser(context, authData) {
    let authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.fbAPIKey}`;
    if (!authData.isLogin) {
      authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.fbAPIKey}`;
    }
    return this.$axios
      .$post(authUrl, {
        email: authData.email,
        password: authData.password,
        returnSecureToken: true,
      })
      .then((res) => {
        context.commit("setToken", res.idToken);

        localStorage.setItem("token", res.idToken);
        localStorage.setItem(
          "tokenExpiration",
          new Date().getTime() + Number.parseInt(res.expiresIn) * 1000
        );

        Cookie.set("jwt", res.idToken);
        Cookie.set(
          "expirationDate",
          new Date().getTime() + Number.parseInt(res.expiresIn) * 1000
        );

        // call
        return this.$axios.$post("http://localhost:3000/api/track-data", {
          data: "Authenticated",
        });
      })
      .catch((e) => {
        console.log(e);
      });
  },
  initAuth(context, req) {
    let token;
    let expirationDate;
    if (req) {
      if (!req.headers.cookie) {
        return;
      }
      const jwtCookie = req.headers.cookie
        .split(";")
        .find((c) => c.trim().startsWith("jwt="));
      if (!jwtCookie) {
        return;
      }
      token = jwtCookie.split("=")[1];
      expirationDate = req.headers.cookie
        .split(";")
        .find((c) => c.trim().startsWith("expirationDate="))
        .split("=")[1];
    } else {
      token = localStorage.getItem("token");
      expirationDate = localStorage.getItem("tokenExpiration");
    }

    if (new Date().getTime() > +expirationDate || !token) {
      context.dispatch("logout");
      return;
    }
    context.commit("setToken", token);
  },
  logout(context) {
    context.commit("clearToken");
    Cookie.remove("jwt");
    Cookie.remove("expirationDate");
    if (process.client) {
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiration");
    }
  },
};

export const getters = {
  loadedPosts(state) {
    return state.loadedPosts;
  },
  isAuthenticated(state) {
    return state.token != null;
  },
};
