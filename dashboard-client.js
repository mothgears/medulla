module.exports = function () {
	var xhr = new XMLHttpRequest();

	function stopServer() {
		var input = document.querySelector('input');
		var pass = null;
		if (input) pass = input.value;

		xhr.open('POST', 'medulla-dashboard', true);
		xhr.onload = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					document.querySelector('body').innerHTML = xhr.responseText;
				} else {
					if (input) input.value = 'INCORRECT';
				}
			}
		};

		var data = {act: "stop"};
		if (pass) data.key = pass;
		xhr.send(JSON.stringify(data));
	}

	document.querySelector('#button_stop').addEventListener('click', stopServer);
};