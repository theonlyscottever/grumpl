const body = document.body;
const site = document.querySelector("#Site");
const mast = document.querySelector("#Masthead");
const overlayBg = document.querySelector("#Overlays");
const overlay = document.querySelector(".overlay");
const closeX = document.querySelector("#Close");
const overlays = document.querySelectorAll(".overlay");
const artists = document.querySelectorAll(".artist");
const grumplBeat = document.createElement("audio");

function toggleSound() {
	if (grumplBeat.paused) {
		grumplBeat.play();
		document.querySelector("#Sound-Toggle img").src = "i/grumpl-skip-big.gif";
	} else {
		grumplBeat.pause();
		document.querySelector("#Sound-Toggle img").src = "i/grumpl-stand.png";
	}
}
function classIt(target, theClass) {
	$(target).addClass(theClass);
}
function unclassIt(target, theClass) {
	$(target).removeClass(theClass);
}
function activate(sleeper) {
	classIt(sleeper, "active");
}
function deactivate(sleeper) {
	unclassIt(sleeper, "active");
}
function delay(n) {
	return new Promise(function (resolve) {
		setTimeout(resolve, n * 500);
	});
}
function openOverlay() {
	deactivate(mast);
	activate(closeX);
	classIt(body, "hidden");
	activate(overlayBg);
	classIt(body, "no-scroll");
}
// overlays
overlays.forEach((overlay) => {
	function closeOverlay() {
		deactivate(closeX);
		deactivate(overlayBg);
		deactivate(overlay);
		activate(mast);
		unclassIt(body, "hidden");
		unclassIt(body, "no-scroll");
	}
	closeX.addEventListener("pointerdown", () => {
		closeOverlay();
	});
});
// Helper function
let domReady = (cb) => {
	document.readyState === "interactive" || document.readyState === "complete" ? cb() : document.addEventListener("DOMContentLoaded", cb);
};

domReady(() => {
	(grumplBeat.src = "a/grumplbeat.mp3"), (grumplBeat.volume = 0.4), (grumplBeat.loop = true), grumplBeat.pause();
	activate(mast);
	unclassIt(body, "hidden");
});

// // observer
const targets = document.querySelectorAll(".card");
const options = {
	root: null,
	rootMargin: "16px",
	threshold: 0,
};
const observer = new IntersectionObserver(callback, options);
targets.forEach((target) => {
	observer.observe(target);
});
function callback(entries, observer) {
	entries.forEach((entry) => {
		if (entry.isIntersecting) {
			addActiveClass(entry.target);
		} else if (!entry.isIntersecting) {
			removeActiveClass(entry.target);
		}
	});
}
function addActiveClass(element) {
	element.classList.add("observed");
}
function removeActiveClass(element) {
	element.classList.remove("observed");
}
