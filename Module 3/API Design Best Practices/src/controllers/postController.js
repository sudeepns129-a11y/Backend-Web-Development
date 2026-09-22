const service = require('../services/postService');
const http = require('../utils/http');

function listPosts(req, res) {
  return http.sendList(res, service.listPosts(req.query));
}

function getPost(req, res) {
  const post = service.getPost(req.params.id);
  if (!post) {
    return http.sendError(res, 404, 'NOT_FOUND', 'Post not found');
  }
  return http.sendOk(res, post);
}

function createPost(req, res) {
  const post = service.createPost(req.body);
  return http.sendCreated(res, post);
}

function likePost(req, res) {
  try {
    const post = service.likePost(req.params.id);
    return http.sendCreated(res, { postId: post.id, likes: post.likes });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return http.sendError(res, 404, err.code, err.message);
    }
    return http.sendInternalError(res, err);
  }
}

function explode(req, res) {
  try {
    service.explode();
  } catch (err) {
    return http.sendInternalError(res, err);
  }
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  likePost,
  explode
};
