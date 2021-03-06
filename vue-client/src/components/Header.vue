<template lang="pug">
  div
    v-app-bar(
      light
      app
      absolute
      color="white"
    )
      router-link.pl-3#logo(to="/")
        img#logo-img(:src="require('../assets/violian_logo.png')" height="46")
      v-spacer

      v-toolbar-items(v-if="!$store.state.isUserLoggedIn && !minimiseNav")
        v-btn(depressed to="/register" color="white") Register
        v-btn(depressed to="/login" color="white") Log In
      v-toolbar-items(v-if="$store.state.isUserLoggedIn && !minimiseNav")
        v-btn(depressed to="/" color="white") Home
        v-btn(depressed to="/course/index" color="white") My Courses
        v-btn(depressed to="/submissions" color="white" v-if="notifications > 0") Submissions
          #notification {{ notifications }}
        v-btn(depressed to="/submissions" color="white" v-else) Submissions
        v-btn(depressed @click="logout" color="white") Log Out

      v-app-bar-nav-icon(@click="drawer = true" v-if="minimiseNav")
    
    v-navigation-drawer(v-model='drawer' absolute temporary right)
      v-list(nav dense v-if="$store.state.isUserLoggedIn")
        v-list-item-group(active-class="text--accent-4" )
          v-list-item(to="/")
            v-list-item-icon
              v-icon mdi-home
            v-list-item-title Home
          v-list-item(to="/course/index")
            v-list-item-icon
              v-icon mdi-playlist-music
            v-list-item-title My Courses
          v-list-item(@click="logout")
            v-list-item-icon
              v-icon mdi-logout
            v-list-item-title Log Out
      v-list(nav dense v-else)
        v-list-item-group(active-class="text--accent-4")
          v-list-item(to="/")
            v-list-item-icon
              v-icon mdi-home
            v-list-item-title Home
          v-list-item(to="/register")
            v-list-item-icon
              v-icon mdi-account
            v-list-item-title Register
          v-list-item(to="/login")
            v-list-item-icon
              v-icon mdi-account
            v-list-item-title Log In

</template>

<script>
import {mapState} from 'vuex'
import RecordingService from "@/services/RecordingService"

export default {
  name: 'Header',
  data () {
    return {
      drawer: false,
      messages: 0,
    }
  },

  methods: {
    logout () {
      this.$store.dispatch('setToken', null)
      this.$store.dispatch('setUser', null)
      if (this.$route.path == "/") {
        this.$router.go()
      } else {
        this.$router.push('/')
      }
    }
  },

  computed: {
    minimiseNav () {
      switch (this.$vuetify.breakpoint.name) {
        case 'xs': return true
        case 'sm': return true
        case 'md': return false
        case 'lg': return false
        case 'xl': return false
        default: return true
      }
    },

    is_student () {
      if (this.user) {
        return this.user.isStudent
      } else {
        return null
      }
    },

    ...mapState(['user', 'notifications'])
  },

  mounted: async function () {
    if (this.user) {
      if (this.is_student) {
        let recordings = (await RecordingService.getUnreadComments()).data.recordings;
        this.$store.dispatch('setNotifications', recordings.length)
      } else {
        let recordings = (await RecordingService.getUncommentedRecordings()).data.recordings
        this.$store.dispatch('setNotifications', recordings.length)
      }
    }
  }
}
</script>

<style scoped>
#logo-img {
  margin-top: 8px;
}

#notification {
  position: absolute;
  background: #C62828;
  top: -14px;
  right: -16px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 14px;
  line-height: 1.35rem;
  color: white;
  text-align: center;
}
</style>
