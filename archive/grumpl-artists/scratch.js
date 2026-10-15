// example js disabling
var button = document.querySelector(".btn");
function checkDisabled() {
	if (button.disabled) {
		button.removeAttribute("disabled");
	} else {
		button.setAttribute("disabled", true);
	}
}
