<template>
  <v-card
    class="mx-auto mt-10"
    max-width="700"
  >
    <v-toolbar
      color="teal"
      dark
    >
      <v-app-bar-nav-icon></v-app-bar-nav-icon>
      <v-toolbar-title>My Courses</v-toolbar-title>
      <v-spacer></v-spacer>
      
    </v-toolbar>

    <v-list>
      <v-list-group
        v-for="item in items"
        :key="item.title"
        v-model="item.active"
        :prepend-icon="item.action"
        no-action
      >
        <template v-slot:activator>
          <v-list-item-content>
            <v-list-item-title class="courseTitle" v-text="item.title"></v-list-item-title>
          </v-list-item-content>
        </template>

        <v-list-item
          v-for="child in item.items"
          :key="child.title"
        >
          <v-list-item-content>
            <v-list-item-title >
              <v-row>
              <v-col cols="9">
              <a class="comment" href="/feedback/show/1/lesson/1">{{child.title}} has a new submission from AAA</a>
              </v-col>
            <v-chip
              class="ma-2"
              color="pink"
              label
              text-color="white"
            >11/11/2020 22:55
            </v-chip>
            </v-row>
            </v-list-item-title>

          </v-list-item-content>
        </v-list-item>
      </v-list-group>
    </v-list>
  </v-card>
</template>

<script>
  export default {
    data: () => ({
      items: [
        {
          action: 'mdi-ticket',
          items: [{ title: 'List Item' }],
          title: 'Course 1',
        },
        {
          action: 'mdi-silverware-fork-knife',
          active: true,
          items: [
            { title: 'Breakfast & brunch' },
            { title: 'New American' },
          ],
          title: 'Course 2',
        },
        {
          action: 'mdi-school',
          items: [{ title: 'List Item' }],
          title: 'Course 3',
        }
      ],
    }),

    methods: {
      redirect() {
      }
    }
    
  }
</script>

<style scoped>


.comment {
  font-weight: bold;
}

.courseTitle {
  font-size: 20px;
}

</style>
