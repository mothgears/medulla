module.exports = model=>`
<html>
	<body style="font-family: Consolas, monospace; font-size: 13px">
		Server lauched on: ${model.medullaLauched}<br>
		Workers lauched on: ${model.workersLauched}<br>
		<br>
		Total workers lauched: ${model.totalWorkers}<br>
		<br>
		Requests: ${model.requests} (updated once a minute)<br>
		Requests per minute: ${(model.requests / model.worktime).toFixed(2)}<br>
		<br>
		<span id="button_stop" style="cursor: pointer"><u>Stop/Restart server</u></span>
		
		`+(model.withpass?`<input type="text" placeholder="password" style="text-align: center">`:'')+`
	</body>
	<script src="medulla-dashboard.js"></script>
</html>`;