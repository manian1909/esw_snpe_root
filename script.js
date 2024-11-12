const channelId = '2696895'; // Replace with your channel ID
const apiKey = 'VTICFT6M5B9JJW0L'; // Replace with your Read API Key

const apiUrl = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&results=10`;

const speedField = 1; // Field number for speed
const voltageField = 3; // Field number for voltage
const angleField = 2; // Field number for current angle

// Fetch ThingSpeak data
async function fetchThingSpeakData() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const feeds = data.feeds;

        // Log data to check what is being fetched
        console.log(feeds);

        // Update latest values in the 'latest' divs
        const latestFeed = feeds[feeds.length - 1];
        console.log(latestFeed); // Debugging log to check the latest feed values

        // Set latest values to the 'latest' divs, handle potential null or undefined values
        document.getElementById('speedValue').innerText = latestFeed[`field${speedField}`] || 'No data';
        document.getElementById('voltageValue').innerText = latestFeed[`field${voltageField}`] || 'No data';
        document.getElementById('angleValue').innerText = latestFeed[`field${angleField}`] || 'No data';

        // Prepare data for charts
        const timeStamps = feeds.map(feed => new Date(feed.created_at).toLocaleTimeString());
        const speedData = feeds.map(feed => feed[`field${speedField}`]);
        const voltageData = feeds.map(feed => feed[`field${voltageField}`]);
        const angleData = feeds.map(feed => feed[`field${angleField}`]);

        // Update the charts with new data
        updateChart(speedChart, timeStamps, speedData);
        updateChart(voltageChart, timeStamps, voltageData);
        updateChart(angleChart, timeStamps, angleData);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Update the charts with new data
function updateChart(chart, labels, data) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

// Create charts
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

// Fetch data every 2 seconds
setInterval(() => {
    fetchThingSpeakData();
}, 2000);

// Initial call to load data
fetchThingSpeakData();
