# getting started
- `npm run dev` - starts dev server

# paths
## login
- POST `/register { email, password }` - `{ user: <userObj>, token: jwtSignedToken}`
- POST `/login { email, password }` - `{ user: <userObj>, token: jwtSignedToken}`

## users
- GET `/user/list` - `{ users: [<userObj>] }`
- GET `/student/list` - `{ students: [<userObj>] }`
- GET `/tutor/list` - `{ tutors: [<userObj>] }`

## courses
- course management
  - GET `/course/list?uid=` - `{ courses: [<courseObj>] }`
  - GET `/course/listall?search=&instrument=` - `{ courses: [<courseObj>] }`
  - GET `/course/show?cid=` - `{ course: <courseObj> } gets detailed course obj including lessons`
  - POST `/course/new { name, price, description, langauge, level, instrument,  TutorId }` - `{ course: <courseObj> }`
  - PUT `/course/edit { courseObj }` - `{ course: <courseObj> }`
  - DELETE `/course/del?cid=` - `{ data: ok }`

## lessons
- lesson management
  - POST `/lesson/new { name, duration, description, cid }` - `{ lesson: <lessonObj> }`
  - PUT `/lesson/edit { name, duration, description, cid, id }` - `{ lesson: <lessonObj> }`
  - GET `/lesson/list?cid=` - `{ lessons: [<lessonObj>] }`
  - GET `/show?lid=` - `{ lesson: <lessonObj> }`
  - DELETE `/lesson/del?lid=` - `{ data: ok }`

## exercises
- exercise management
  - POST `/exercise/new { name, melody, timeSignature, bpm, video, videoPoster, useXml, musicXml, lid }` - `{ exercise: <exerciseObj> }`
  - PUT `/exercise/edit { name, melody, timeSignature, bpm, video, videoPoster, useXml, musicXml, eid }` - `{ exercise: <exerciseObj> }`
  - GET `/exercise/list?lid=` - `{ exercises: [<exerciseObj>] }`
  - DELETE `/exercise/del?eid=` - `{ data: ok }`

## recordings
- recording management
  - POST `/recording/new { eid, audio }` - `{ recording: <recordingObj>`
  - GET `/recording/list?eid=` - `{ recordings: [<recordingObj>] }`
  - DELETE `/recording/del?rid=` - `{ data: ok }`
  - GET `/recording/get-notes?rid=` - `{ recording: [<recordingObj>] }`
  - POST `/recording/update-notes?rid= { transcription, overallComment }` - `{ recording: [<recordingObj>] }`
  - POST `/recording/mark-commented?rid=` - `{ recording: [<recordingObj>] }`
  - POST `/recording/mark-read?rid=` - `{ recording: [<recordingObj>] }`
  - GET `/recording/get-uncommented-recordings` - `{ recordings: [{ recording_id, updated_at, exercise_id, lesson_id, course_id, course_name, student_name, tutor_name, is_commented, is_read }]}`
  - GET `/recording/get-unread-comments` - `{ recordings: [{ recording_id, updated_at, exercise_id, lesson_id, course_id, course_name, student_name, tutor_name, is_commented, is_read }]}`

## subscriptions for student and course
- POST `/subscribe/new { studentId, courseId }` - `{ data: ok }`
- GET `/subscribe/get/student?uid=` - `{ courses: [<courseObj>] }`
- GET `/subscribe/get/course?cid=` - `{ students: [<userObj>] }`
- GET `/subscribe/get/is-subscribed?cid=` - `{ isSubscribed: boolean }`
- GET `/subscribe/get/is-owned?cid=` - `{ isOwned: boolean }`

## threads
- thread management
  - GET `/thread/list?lid=` - `{ threads: [<threadObj>] } // get threads of a specific lesson, should be called by tutor`
  - GET `/thread/show?uid=&lid=` - `{ thread: <threadObj> }`
  - GET `/thread/unread?cid=&uid=` - `{ unread: int }`
  - POST `/thread/new { lid }` - `{ thread: threadObj }`
  - DELETE `/thread/del?tid=` - `{ data: ok }`

## posts
- post management
  - GET `/post/list?tid=` - `{ posts: [<postObj>] }` - `{ posts: [<postObj>] }`
  - GET `/post/show?pid=` - `{ post: <postObj> }`
  - POST `/post/new { video, message, grade, tid }` - `{ post: <postObj> }`
  - PUT `/post/edit { pid, video, message, grade }` - `{ post: <postObj> }`
  - DELETE `/post/del?pid=` - `{ data: ok }`

## payments
- manage with braintree
  - GET `/braintree-client-token` - `{ clientToken: client_token }`
  - POST `/braintree-checkout { amount, nonce, deviceData }` - `{ result: responseObj }`
  - POST `/braintree-paypal-checkout` - `{ result: responseObj }`
- manage with paypal directly
  - GET `/paypal-access-token` - `{ token: access_token }`
  - GET `/paypal-client-token` - `{ token: client_token }`
  - POST `/paypal-new-payout { accessToken, amount, courseId }` - `{ result: responseObj }`

## files
- file management
  - GET `/file/list?lid=` - - `{ files: [<fileObj>] }`
  - POST `/file/new { file, lessonId, name, url, size, type }` - `{ file: <fileObj> }`
  - DELETE `/file/del?fid=` - `{ data: ok }`

# TODOs
- Add published attribute to course to determine whether a course should be shown to the public
