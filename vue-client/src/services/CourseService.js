import Api from '@/services/Api'

export default {
  create (courseInfo) {
    return Api().post('course/new', courseInfo)
  },

  list (userId) {
    return Api().get(`course/list?uid=${userId}`)
  },

  listAll (search, instrument) {
    if (search && instrument) {
      return Api().get(`course/listall?search=${search}&instrument=${instrument}`)
    } else if (search && !instrument) {
      return Api().get(`course/listall?search=${search}`)
    } else if (!search && instrument) {
      return Api().get(`course/listall?&instrument=${instrument}`)
    } else {
      return Api().get(`course/listall`)
    }
  },

  show (cid) {
    return Api().get(`course/show?cid=${cid}`)
  },

  edit (courseInfo) {
    const instance = Api()
    instance.defaults.headers.put['Content-Type'] = 'multipart/form-data'
    return instance.put('course/edit', courseInfo)
  },

  delete (courseId) {
    return Api().delete(`course/del?cid=${courseId}`)
  }
}
