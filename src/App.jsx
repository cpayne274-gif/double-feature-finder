import { useState } from "react";
import movies from "../data/movies.json";
import "./App.css";

function normalizeText(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(text) {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 2);
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function scoreArray(items = [], queryWords = [], weight = 1) {
  const normalizedItems = items.map((item) => normalizeText(item));
  let score = 0;
  let matchedTags = [];

  queryWords.forEach((word) => {
    normalizedItems.forEach((item) => {
      if (item.includes(word)) {
        score += weight;
        matchedTags.push(item);
      }
    });
  });

  return {
    score,
    matchedTags,
  };
}

function scoreMovie(movie, searchText) {
  const queryWords = getWords(searchText);

  const title = normalizeText(movie.title);
  const year = movie.year?.toString() || "";

  let totalScore = 0;
  let matchedTags = [];

  queryWords.forEach((word) => {
    if (title.includes(word)) {
      totalScore += 8;
      matchedTags.push(movie.title);
    }

    if (year.includes(word)) {
      totalScore += 4;
      matchedTags.push(year);
    }
  });

  const genreScore = scoreArray(movie.genres, queryWords, 4);
  const moodScore = scoreArray(movie.moods, queryWords, 3);
  const styleScore = scoreArray(movie.styles, queryWords, 3);
  const themeScore = scoreArray(movie.themes, queryWords, 2);

  totalScore += genreScore.score;
  totalScore += moodScore.score;
  totalScore += styleScore.score;
  totalScore += themeScore.score;

  matchedTags = [
    ...matchedTags,
    ...genreScore.matchedTags,
    ...moodScore.matchedTags,
    ...styleScore.matchedTags,
    ...themeScore.matchedTags,
  ];

  return {
    score: totalScore,
    matchedTags: [...new Set(matchedTags)],
  };
}

function findMovieByTitle(searchText) {
  const normalizedSearch = normalizeText(searchText);

  if (!normalizedSearch) return null;

  const exactMatch = movies.find(
    (movie) => normalizeText(movie.title) === normalizedSearch
  );

  if (exactMatch) return exactMatch;

  const partialMatch = movies.find((movie) =>
    normalizeText(movie.title).includes(normalizedSearch)
  );

  if (partialMatch) return partialMatch;

  const searchWithoutSpaces = normalizedSearch.replace(/\s/g, "");

  return movies.find((movie) =>
    normalizeText(movie.title).replace(/\s/g, "").includes(searchWithoutSpaces)
  );
}

function getBestMatches(criteria, excludeTitles = [], limit = 5, surprise = false) {
  const scoredMovies = movies
    .filter((movie) => !excludeTitles.includes(movie.title))
    .map((movie) => {
      const result = scoreMovie(movie, criteria);

      return {
        ...movie,
        score: result.score,
        matchedTags: result.matchedTags,
      };
    })
    .filter((movie) => movie.score > 0)
    .sort((a, b) => b.score - a.score);

  if (surprise) {
    const strongMatches = scoredMovies.slice(0, 12);
    return shuffleArray(strongMatches).slice(0, limit);
  }

  return scoredMovies.slice(0, limit);
}

function buildSearchTermsFromMovie(movie) {
  return [
    ...(movie.genres || []),
    ...(movie.moods || []),
    ...(movie.styles || []),
    ...(movie.themes || []),
  ].join(" ");
}

function buildSearchTermsFromMoviePlusCriteria(movie, criteria) {
  return [
    criteria,
    ...(movie.moods || []),
    ...(movie.styles || []),
    ...(movie.themes || []),
  ].join(" ");
}

function getSharedTags(firstFilm, secondFilm) {
  const firstTags = [
    ...(firstFilm.genres || []),
    ...(firstFilm.moods || []),
    ...(firstFilm.styles || []),
    ...(firstFilm.themes || []),
  ].map((tag) => normalizeText(tag));

  const secondTags = [
    ...(secondFilm.genres || []),
    ...(secondFilm.moods || []),
    ...(secondFilm.styles || []),
    ...(secondFilm.themes || []),
  ].map((tag) => normalizeText(tag));

  return firstTags.filter((tag) => secondTags.includes(tag));
}

function getContrastTags(firstFilm, secondFilm) {
  const firstGenres = (firstFilm.genres || []).map((tag) => normalizeText(tag));
  const secondGenres = (secondFilm.genres || []).map((tag) =>
    normalizeText(tag)
  );

  return secondGenres.filter((tag) => !firstGenres.includes(tag));
}

function createWhyText(firstFilm, secondFilm) {
  const sharedTags = getSharedTags(firstFilm, secondFilm);
  const contrastTags = getContrastTags(firstFilm, secondFilm);

  if (sharedTags.length > 0 && contrastTags.length > 0) {
    return `Why it works: both films share ${sharedTags
      .slice(0, 3)
      .join(", ")} energy, but the second film brings a different flavor through ${contrastTags
      .slice(0, 2)
      .join(", ")}.`;
  }

  if (sharedTags.length > 0) {
    return `Why it works: both films connect through ${sharedTags
      .slice(0, 4)
      .join(", ")}, making them feel like part of the same movie-night conversation.`;
  }

  return "Why it works: the pairing creates contrast while still staying close enough in mood, style, or theme to feel intentional.";
}

function App() {
  const [mode, setMode] = useState("same");
  const [criteriaOne, setCriteriaOne] = useState("");
  const [criteriaTwo, setCriteriaTwo] = useState("");
  const [givenFilm, setGivenFilm] = useState("");
  const [results, setResults] = useState([]);

  function generateDoubleFeature(surprise = false) {
    let pairings = [];

    if (mode === "same") {
      const matches = getBestMatches(criteriaOne, [], 8, surprise);

      for (let i = 0; i < matches.length - 1; i += 2) {
        pairings.push({
          firstFilm: matches[i],
          secondFilm: matches[i + 1],
        });
      }
    }

    if (mode === "different") {
      const firstMatches = getBestMatches(criteriaOne, [], 6, surprise);

      firstMatches.forEach((firstFilm) => {
        const secondMatches = getBestMatches(
          criteriaTwo,
          [firstFilm.title],
          3,
          surprise
        );

        if (secondMatches[0]) {
          pairings.push({
            firstFilm,
            secondFilm: secondMatches[0],
          });
        }
      });
    }

    if (mode === "given") {
      const firstFilm = findMovieByTitle(givenFilm);

      if (firstFilm) {
        const searchTerms = buildSearchTermsFromMovie(firstFilm);
        const matches = getBestMatches(
          searchTerms,
          [firstFilm.title],
          6,
          surprise
        );

        pairings = matches.map((secondFilm) => ({
          firstFilm,
          secondFilm,
        }));
      }
    }

    if (mode === "given-plus") {
      const firstFilm = findMovieByTitle(givenFilm);

      if (firstFilm) {
        const searchTerms = buildSearchTermsFromMoviePlusCriteria(
          firstFilm,
          criteriaTwo
        );

        const matches = getBestMatches(
          searchTerms,
          [firstFilm.title],
          6,
          surprise
        );

        pairings = matches.map((secondFilm) => ({
          firstFilm,
          secondFilm,
        }));
      }
    }

    setResults(shuffleArray(pairings).slice(0, 3));
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Double Feature Finder</h1>

        <p className="intro">
          Build a movie-night pairing by vibe, genre, style, theme, or a given
          film.
        </p>

        <label>
          Pairing mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="same">Two films based on the same criteria</option>
            <option value="different">Two films based on different criteria</option>
            <option value="given">Suggest one film based on a given film</option>
            <option value="given-plus">
              Given film + requested pairing criteria
            </option>
          </select>
        </label>

        {mode === "same" && (
          <label>
            What kind of double feature do you want?
            <input
              value={criteriaOne}
              onChange={(e) => setCriteriaOne(e.target.value)}
              placeholder="period drama romance, dark sci-fi, tragic romance..."
            />
          </label>
        )}

        {mode === "different" && (
          <>
            <label>
              First film criteria
              <input
                value={criteriaOne}
                onChange={(e) => setCriteriaOne(e.target.value)}
                placeholder="visually stunning sci-fi"
              />
            </label>

            <label>
              Second film criteria
              <input
                value={criteriaTwo}
                onChange={(e) => setCriteriaTwo(e.target.value)}
                placeholder="uniquely animated fantasy"
              />
            </label>
          </>
        )}

        {(mode === "given" || mode === "given-plus") && (
          <label>
            Given film
            <input
              value={givenFilm}
              onChange={(e) => setGivenFilm(e.target.value)}
              placeholder="Blade Runner"
            />
          </label>
        )}

        {mode === "given-plus" && (
          <label>
            Pair it with
            <input
              value={criteriaTwo}
              onChange={(e) => setCriteriaTwo(e.target.value)}
              placeholder="dark fantasy, tragic romance, surreal animation..."
            />
          </label>
        )}

        <div className="button-row">
          <button onClick={() => generateDoubleFeature(false)}>
            Generate Double Feature
          </button>

          <button className="secondary-button" onClick={() => generateDoubleFeature(true)}>
            Surprise Me
          </button>
        </div>

        {results.length > 0 && (
          <section className="results">
            <h2>Top Double Features</h2>

            {results.map((pairing, index) => (
              <div
                className="pairing"
                key={`${pairing.firstFilm.title}-${pairing.secondFilm.title}-${index}`}
              >
                <h3>Option {index + 1}</h3>

                <div className="movie">
                  <h4>
                    {pairing.firstFilm.title} ({pairing.firstFilm.year})
                  </h4>
                  <p>
                    {pairing.firstFilm.genres?.join(", ")} —{" "}
                    {pairing.firstFilm.moods?.join(", ")}
                  </p>
                </div>

                <div className="plus">+</div>

                <div className="movie">
                  <h4>
                    {pairing.secondFilm.title} ({pairing.secondFilm.year})
                  </h4>
                  <p>
                    {pairing.secondFilm.genres?.join(", ")} —{" "}
                    {pairing.secondFilm.moods?.join(", ")}
                  </p>
                </div>

                <p className="why">
                  {createWhyText(pairing.firstFilm, pairing.secondFilm)}
                </p>
              </div>
            ))}
          </section>
        )}

        {results.length === 0 && (
          <p className="hint">
            Try searches like <strong>dark sci-fi</strong>,{" "}
            <strong>period romance</strong>, <strong>dreamlike fantasy</strong>,
            or use a film like <strong>Blade Runner</strong>.
          </p>
        )}
      </section>
    </main>
  );
}

export default App;