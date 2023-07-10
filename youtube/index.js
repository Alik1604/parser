import fetch from "node-fetch";

const getHtml = async (url) => {
  const result = await fetch(url);
  const html = await result.text();
  return html;
};

const getSongVisibleTimeRangeStartMillis = async (id) => {
  const url = `https://www.youtube.com/watch?v=${id}`;

  const html = await getHtml(url);
  const regex = new RegExp(/"visibleTimeRangeStartMillis"\s*:\s*(\d+)/i);
  let match = regex.exec(html);

  if (match) {
    return Number(match[1]);
  } else {
    return null;
  }
};

const runTest = async () => {
  const songs = [
    ["Kid Cudi", "Pursuit Of Happiness", "7xzU9Qqdqww", 8520],
    ["Drake", "Life Is Good", "l0U7SxXHkPY", 100800],
    ["Eminem", "Paradise", "-ENDgoiJeHo", null],
    ["Post Malone", "Goodbyes", "ba7mB8oueCY", 77100],
    ["Future", "Low Life", "K_9tX4eHztY", 58320],
    ["G-Eazy", "I Mean It", "CxnaPa8ohmM", 11900],
    ["Drake, Post Malone", "Know Your Worth", "5iB6-g7p1Qk", 95170],
    ["DJ Khaled", "I'm The One", "weeI1G46q0o", 38640],
    ["Mac DeMarco", "My Old Man", "utdidBGSw5s", 8960],
    ["Mumford & Sons", "Little Lion Man", "X7bHe--mp1g", 57040],
    ["The Passengers", "Girls Cost Money", "pNCJDaalemU", null],
  ];
  const results = await Promise.all(
    songs.map((song) => getSongVisibleTimeRangeStartMillis(song[2]))
  );
  results.forEach((item, index) => {
    console.log(
      `${songs[index][0]}: got ${item} -> expected ${songs[index][3]}`,
      item === songs[index][3]
    );
  });
};
runTest();
