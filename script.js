const channelId = '2696895';
const apiKey = 'VTICFT6M5B9JJW0L';

const apiUrl = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&results=10`;

const speedField = 1;
const voltageField = 3;
const angleField = 2;

async function fetchThingSpeakData() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const feeds = data.feeds;

        console.log(feeds);

        const latestFeed = feeds[feeds.length - 1];
        console.log(latestFeed);

        document.getElementById('speedValue').innerText = latestFeed[`field${speedField}`] || 'No data';
        document.getElementById('voltageValue').innerText = latestFeed[`field${voltageField}`] || 'No data';
        document.getElementById('angleValue').innerText = latestFeed[`field${angleField}`] || 'No data';

        const timeStamps = feeds.map(feed => new Date(feed.created_at).toLocaleTimeString());
        const speedData = feeds.map(feed => feed[`field${speedField}`]);
        const voltageData = feeds.map(feed => feed[`field${voltageField}`]);
        const angleData = feeds.map(feed => feed[`field${angleField}`]);

        updateChart(speedChart, timeStamps, speedData);
        updateChart(voltageChart, timeStamps, voltageData);
        updateChart(angleChart, timeStamps, angleData);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function updateChart(chart, labels, data) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

const speedChart = new Chart(document.getElementById('speedChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Angle (Degrees)',
            borderColor: 'rgb(255, 99, 132)',
            fill: false,
            data: []
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Angle (Degrees)' }}
        }
    }
});

const voltageChart = new Chart(document.getElementById('voltageChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Target Position',
            borderColor: 'rgb(54, 162, 235)',
            fill: false,
            data: []
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Target Position' }}
        }
    }
});

const angleChart = new Chart(document.getElementById('angleChart').getContext('2d'), {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Current Position',
            borderColor: 'rgb(75, 192, 192)',
            fill: false,
            data: []
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: { title: { display: true, text: 'Time' }},
            y: { title: { display: true, text: 'Current Position' }}
        }
    }
});

function sendAngle() {
    const angle = document.getElementById('angleInput').value;
    if (!angle || isNaN(angle)) {
        alert("Please enter a valid angle.");
        return;
    }

    fetch('http://192.168.178.220/setAngle?angle=' + encodeURIComponent(angle), {
        method: 'GET'
    })
    .then(response => {
        if (response.ok) {
            alert('Angle set successfully');
        } else {
            alert('Failed to set angle');
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Failed to connect to ESP32.");
    });
}

setInterval(() => {
    fetchThingSpeakData();
}, 2000);

fetchThingSpeakData();
