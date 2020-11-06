<template lang="pug">
  v-card.mx-auto
    v-img.white--text.align-end(v-if="course.coverPhotoUrl" height="160px" :src="course.coverPhotoUrl" gradient="to top right, rgba(0,0,0,.5), rgba(0,0,0,.5)")
      v-card-title(style="text-shadow: 1px 1px 2px #000000;") {{ course.name }}
    v-card-title(v-else) {{ course.name }}
    v-card-subtitle.pb-0.text-left {{ course.instrument }}
    v-card-text.text-left.text--primary.pb-0
      div {{ course.tagline }}
    slot
</template>

<script>
export default {
  props: [
    "course"
  ]
}
</script>

<style>
</style>
