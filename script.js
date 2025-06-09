function addPost() {
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (title === "" || content === "") {
    alert("Please fill in both fields!");
    return;
  }

  const postContainer = document.getElementById("posts");

  const post = document.createElement("div");
  post.classList.add("post");

  post.innerHTML = `
    <h2>${title}</h2>
    <p>${content}</p>
    <button class="delete-btn" onclick="this.parentElement.remove()">Delete</button>
  `;

  postContainer.prepend(post);

  // Clear form
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
}
