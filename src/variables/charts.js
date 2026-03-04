// AI Clipping Agent — Chart Variables

const baseOptions = {
  maintainAspectRatio: false,
  legend: { display: false },
  tooltips: {
    backgroundColor: "#f5f5f5",
    titleFontColor: "#333",
    bodyFontColor: "#666",
    bodySpacing: 4,
    xPadding: 12,
    mode: "nearest",
    intersect: 0,
    position: "nearest",
  },
  responsive: true,
  scales: {
    yAxes: {
      barPercentage: 1.6,
      gridLines: {
        drawBorder: false,
        color: "rgba(29,140,248,0.0)",
        zeroLineColor: "transparent",
      },
      ticks: {
        suggestedMin: 0,
        padding: 20,
        fontColor: "#9a9a9a",
      },
    },
    xAxes: {
      barPercentage: 1.6,
      gridLines: {
        drawBorder: false,
        color: "rgba(29,140,248,0.1)",
        zeroLineColor: "transparent",
      },
      ticks: {
        padding: 20,
        fontColor: "#9a9a9a",
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// chartClipsOverTime  (Dashboard + Analytics)
// ─────────────────────────────────────────────────────────────────────────────
const chartClipsOverTime = {
  clips: (canvas) => {
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 230, 0, 50);
    grad.addColorStop(1, "rgba(29,140,248,0.2)");
    grad.addColorStop(0.4, "rgba(29,140,248,0.0)");
    grad.addColorStop(0, "rgba(29,140,248,0)");
    return {
      labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
      datasets: [
        {
          label: "Clips Generated",
          fill: true,
          backgroundColor: grad,
          borderColor: "#1f8ef1",
          borderWidth: 2,
          borderDash: [],
          borderDashOffset: 0.0,
          pointBackgroundColor: "#1f8ef1",
          pointBorderColor: "rgba(255,255,255,0)",
          pointHoverBackgroundColor: "#1f8ef1",
          pointBorderWidth: 20,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 15,
          pointRadius: 4,
          data: [42, 68, 95, 110, 88, 130, 145, 162, 140, 180, 210, 247],
        },
      ],
    };
  },
  views: (canvas) => {
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 230, 0, 50);
    grad.addColorStop(1, "rgba(0,214,180,0.2)");
    grad.addColorStop(0.4, "rgba(0,214,180,0.0)");
    grad.addColorStop(0, "rgba(0,214,180,0)");
    return {
      labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
      datasets: [
        {
          label: "Views (K)",
          fill: true,
          backgroundColor: grad,
          borderColor: "#00d6b4",
          borderWidth: 2,
          borderDash: [],
          borderDashOffset: 0.0,
          pointBackgroundColor: "#00d6b4",
          pointBorderColor: "rgba(255,255,255,0)",
          pointHoverBackgroundColor: "#00d6b4",
          pointBorderWidth: 20,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 15,
          pointRadius: 4,
          data: [80, 150, 220, 310, 280, 420, 510, 600, 490, 680, 820, 950],
        },
      ],
    };
  },
  engagement: (canvas) => {
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 230, 0, 50);
    grad.addColorStop(1, "rgba(208,72,182,0.2)");
    grad.addColorStop(0.4, "rgba(208,72,182,0.0)");
    grad.addColorStop(0, "rgba(208,72,182,0)");
    return {
      labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
      datasets: [
        {
          label: "Engagement %",
          fill: true,
          backgroundColor: grad,
          borderColor: "#d048b6",
          borderWidth: 2,
          borderDash: [],
          borderDashOffset: 0.0,
          pointBackgroundColor: "#d048b6",
          pointBorderColor: "rgba(255,255,255,0)",
          pointHoverBackgroundColor: "#d048b6",
          pointBorderWidth: 20,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 15,
          pointRadius: 4,
          data: [4.2, 5.1, 6.8, 7.2, 6.5, 8.1, 8.9, 9.4, 8.7, 10.2, 11.5, 12.3],
        },
      ],
    };
  },
  options: baseOptions,
};

// ─────────────────────────────────────────────────────────────────────────────
// chartPlatformViews  (Dashboard + Analytics)
// ─────────────────────────────────────────────────────────────────────────────
const chartPlatformViews = {
  data: (canvas) => {
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 230, 0, 50);
    grad.addColorStop(1, "rgba(29,140,248,0.2)");
    grad.addColorStop(0.4, "rgba(29,140,248,0.0)");
    grad.addColorStop(0, "rgba(29,140,248,0)");
    return {
      labels: ["JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
      datasets: [
        {
          label: "Views (K)",
          fill: true,
          backgroundColor: grad,
          borderColor: "#1f8ef1",
          borderWidth: 2,
          borderDash: [],
          borderDashOffset: 0.0,
          pointBackgroundColor: "#1f8ef1",
          pointBorderColor: "rgba(255,255,255,0)",
          pointHoverBackgroundColor: "#1f8ef1",
          pointBorderWidth: 20,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 15,
          pointRadius: 4,
          data: [510, 600, 490, 680, 820, 950],
        },
      ],
    };
  },
  options: baseOptions,
};

// ─────────────────────────────────────────────────────────────────────────────
// chartPostsPerPlatform  (Dashboard + Analytics)
// ─────────────────────────────────────────────────────────────────────────────
const chartPostsPerPlatform = {
  data: (canvas) => {
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 230, 0, 50);
    grad.addColorStop(1, "rgba(72,72,176,0.1)");
    grad.addColorStop(0.4, "rgba(72,72,176,0.0)");
    grad.addColorStop(0, "rgba(119,52,169,0)");
    return {
      labels: ["TikTok", "Instagram", "YouTube"],
      datasets: [
        {
          label: "Posts Published",
          fill: true,
          backgroundColor: ["rgba(255,99,132,0.6)", "rgba(255,193,7,0.6)", "rgba(29,140,248,0.6)"],
          hoverBackgroundColor: ["rgba(255,99,132,0.9)", "rgba(255,193,7,0.9)", "rgba(29,140,248,0.9)"],
          borderColor: ["#ff6384", "#ffc107", "#1f8ef1"],
          borderWidth: 2,
          borderDash: [],
          borderDashOffset: 0.0,
          data: [448, 277, 168],
        },
      ],
    };
  },
  options: {
    maintainAspectRatio: false,
    legend: { display: false },
    tooltips: {
      backgroundColor: "#f5f5f5",
      titleFontColor: "#333",
      bodyFontColor: "#666",
      bodySpacing: 4,
      xPadding: 12,
      mode: "nearest",
      intersect: 0,
      position: "nearest",
    },
    responsive: true,
    scales: {
      yAxes: {
        gridLines: {
          drawBorder: false,
          color: "rgba(225,78,202,0.1)",
          zeroLineColor: "transparent",
        },
        ticks: {
          suggestedMin: 0,
          suggestedMax: 500,
          padding: 20,
          fontColor: "#9e9e9e",
        },
      },
      xAxes: {
        gridLines: {
          drawBorder: false,
          color: "rgba(225,78,202,0.1)",
          zeroLineColor: "transparent",
        },
        ticks: {
          padding: 20,
          fontColor: "#9e9e9e",
        },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// chartEngagement  (Analytics)
// ─────────────────────────────────────────────────────────────────────────────
const chartEngagement = {
  data: (canvas) => {
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 230, 0, 50);
    grad.addColorStop(1, "rgba(66,134,121,0.15)");
    grad.addColorStop(0.4, "rgba(66,134,121,0.0)");
    grad.addColorStop(0, "rgba(66,134,121,0)");
    return {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Engagement %",
          fill: true,
          backgroundColor: grad,
          borderColor: "#00d6b4",
          borderWidth: 2,
          borderDash: [],
          borderDashOffset: 0.0,
          pointBackgroundColor: "#00d6b4",
          pointBorderColor: "rgba(255,255,255,0)",
          pointHoverBackgroundColor: "#00d6b4",
          pointBorderWidth: 20,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 15,
          pointRadius: 4,
          data: [8.2, 9.4, 7.8, 11.2, 12.5, 14.1, 10.3],
        },
      ],
    };
  },
  options: {
    maintainAspectRatio: false,
    legend: { display: false },
    tooltips: {
      backgroundColor: "#f5f5f5",
      titleFontColor: "#333",
      bodyFontColor: "#666",
      bodySpacing: 4,
      xPadding: 12,
      mode: "nearest",
      intersect: 0,
      position: "nearest",
    },
    responsive: true,
    scales: {
      yAxes: {
        barPercentage: 1.6,
        gridLines: {
          drawBorder: false,
          color: "rgba(29,140,248,0.0)",
          zeroLineColor: "transparent",
        },
        ticks: {
          suggestedMin: 0,
          suggestedMax: 20,
          padding: 20,
          fontColor: "#9e9e9e",
        },
      },
      xAxes: {
        barPercentage: 1.6,
        gridLines: {
          drawBorder: false,
          color: "rgba(0,242,195,0.1)",
          zeroLineColor: "transparent",
        },
        ticks: {
          padding: 20,
          fontColor: "#9e9e9e",
        },
      },
    },
  },
};

module.exports = {
  chartClipsOverTime,
  chartPlatformViews,
  chartPostsPerPlatform,
  chartEngagement,
};
