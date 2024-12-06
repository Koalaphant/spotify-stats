const clientId = "97f3d875a04a466ca62e384819e1a339";
const redirectUri = "http://localhost:5173"; // Make sure this is the same as your registered redirect URI
const code = new URLSearchParams(window.location.search).get("code");

// Check for access token in localStorage
let accessToken = localStorage.getItem("access_token");

if (!accessToken) {
  if (!code) {
    console.log(
      "No code or token found. Redirecting to Spotify for authorisation."
    );
    redirectToAuthCodeFlow(clientId, redirectUri);
  } else {
    console.log("Authorisation code found:", code);
    try {
      accessToken = await getAccessToken(clientId, code, redirectUri);
      console.log("Access token retrieved:", accessToken);

      // Store the access token in localStorage
      localStorage.setItem("access_token", accessToken);

      loadSpotifyData(accessToken);
      window.history.replaceState({}, document.title, "/"); // Clear the code from URL
    } catch (error) {
      console.error("Error during authorisation:", error);
    }
  }
} else {
  console.log("Access token found in localStorage:", accessToken);
  loadSpotifyData(accessToken);
}

// Function to fetch and display Spotify data
async function loadSpotifyData(accessToken) {
  try {
    const profile = await fetchProfile(accessToken);
    console.log("Profile data retrieved:", profile);
    populateUI(profile);

    const topTracks = await fetchTopTracks(accessToken);
    console.log("Top tracks retrieved:", topTracks);
    displayTopTracks(topTracks);
  } catch (error) {
    console.error("Error fetching Spotify data:", error);

    // Handle invalid/expired token by clearing it and reauthenticating
    if (error.message.includes("401")) {
      console.log(
        "Access token expired. Clearing localStorage and redirecting."
      );
      localStorage.removeItem("access_token");
      redirectToAuthCodeFlow(clientId, redirectUri);
    }
  }
}

export async function redirectToAuthCodeFlow(clientId, redirectUri) {
  console.log("Initiating redirect to Spotify for authorisation.");
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);
  console.log("Code verifier saved to localStorage:", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", redirectUri);
  params.append("scope", "user-read-private user-read-email user-top-read");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function getAccessToken(clientId, code, redirectUri) {
  console.log("Fetching access token using code:", code);
  const verifier = localStorage.getItem("verifier");
  console.log("Retrieved verifier from localStorage:", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);
  params.append("code_verifier", verifier);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await result.json();
  console.log("Access token response:", data);
  return data.access_token;
}

function generateCodeVerifier(length) {
  console.log("Generating code verifier.");
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  console.log("Generating code challenge from verifier.");
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function fetchProfile(token) {
  console.log("Fetching user profile.");
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await result.json();
  console.log("User profile response:", data);
  return data;
}

async function fetchTopTracks(token, timeRange = "long_term") {
  console.log(`Fetching user's top tracks for the ${timeRange} range.`);
  const result = await fetch(
    `https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${timeRange}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await result.json();
  console.log("Top tracks response:", data);
  return data;
}

function populateUI(profile) {
  console.log("Populating UI with profile data.");
  document.getElementById("displayName").innerText = profile.display_name;
  if (profile.images[0]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[0].url;
    document.getElementById("avatar").appendChild(profileImage);
  }
}

function displayTopTracks(topTracks) {
  console.log("Displaying top tracks in UI.");
  const tracksContainer = document.getElementById("topTracks");
  tracksContainer.innerHTML = ""; // Clear any existing content

  topTracks.items.forEach((track, index) => {
    const trackElement = document.createElement("div");
    trackElement.className = "track";

    trackElement.innerHTML = `
      <p style="margin-right: 10px">${index + 1}</p>
      <img src="${track.album.images[0].url}" alt="${track.name}" width="100" />
      <p><strong>${track.name}</strong> by ${track.artists
      .map((artist) => artist.name)
      .join(", ")}</p>
    `;

    tracksContainer.appendChild(trackElement);
  });
}
