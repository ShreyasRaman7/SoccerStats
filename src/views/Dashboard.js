import React from "react";
import classNames from "classnames";
import { Line, Bar } from "react-chartjs-2";
import {
  Button, ButtonGroup, Card, CardHeader, CardBody, CardTitle,
  Row, Col, Input, InputGroup, InputGroupAddon, Badge, Progress,
} from "reactstrap";
import { chartClipsOverTime, chartPostsPerPlatform, chartPlatformViews } from "variables/charts.js";

const STATUS_COLOR = {
  done: "success", queued: "secondary", downloading: "info",
  transcribing: "info", scoring: "info", clipping: "warning", error: "danger",
};
const STATUS_LABEL = {
  done: "Done", queued: "Queued", downloading: "Downloading",
  transcribing: "Transcribing", scoring: "AI Scoring", clipping: "Clipping", error: "Error",
};

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function Dashboard() {
  const [ytUrl,      setYtUrl]      = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted,  setSubmitted]  = React.useState(false);
  const [jobs,       setJobs]       = React.useState([]);
  const [analytics,  setAnalytics]  = React.useState(null);
  const [chartView,  setChartView]  = React.useState("clips");

  const loadData = React.useCallback(() => {
    fetch("/api/jobs").then((r) => r.json()).then(setJobs).catch(() => {});
    fetch("/api/analytics").then((r) => r.json()).then(setAnalytics).catch(() => {});
  }, []);

  React.useEffect(() => {
    loadData();
    const t = setInterval(loadData, 5000);
    return () => clearInterval(t);
  }, [loadData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;
    setSubmitting(true);
    fetch("/api/jobs", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ url: ytUrl }),
    })
      .then(() => {
        setSubmitting(false);
        setSubmitted(true);
        setYtUrl("");
        setTimeout(() => setSubmitted(false), 3500);
        loadData();
      })
      .catch(() => setSubmitting(false));
  };

  const totalViews = analytics?.total_views    ?? 0;
  const totalClips = analytics?.total_clips    ?? 0;
  const totalPosts = analytics?.total_posts    ?? 0;
  const avgScore   = analytics?.avg_viral_score ?? 0;

  return (
    <>
      <div className="content">
        <Row>
          <Col xs="12">
            <Card style={{ background: "linear-gradient(135deg,#1a1e34 0%,#1d2035 100%)", border: "1px solid rgba(29,140,248,0.25)" }}>
              <CardBody>
                <Row className="align-items-center">
                  <Col md="8">
                    <h2 className="mb-1" style={{ color: "#fff", fontWeight: 700 }}>AI Clipping Agent</h2>
                    <p className="mb-3" style={{ color: "#9a9a9a", fontSize: "0.95rem" }}>
                      Paste a YouTube link — finds viral clips, adds captions, tracks faces, posts to TikTok, Instagram &amp; YouTube.
                    </p>
                    <form onSubmit={handleSubmit}>
                      <InputGroup>
                        <Input
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={ytUrl}
                          onChange={(e) => setYtUrl(e.target.value)}
                          style={{ background: "#1d1f33", border: "1px solid rgba(29,140,248,0.4)", color: "#fff" }}
                        />
                        <InputGroupAddon addonType="append">
                          <Button color="info" type="submit" disabled={submitting || !ytUrl.trim()} style={{ minWidth: 130 }}>
                            {submitting
                              ? <span><i className="tim-icons icon-refresh-02" /> Analyzing...</span>
                              : <span><i className="tim-icons icon-triangle-right-17" /> Process</span>}
                          </Button>
                        </InputGroupAddon>
                      </InputGroup>
                      {submitted && (
                        <p className="mt-2 mb-0" style={{ color: "#00d6b4", fontSize: "0.85rem" }}>
                          <i className="tim-icons icon-check-2" /> Job queued! AI is analyzing your video.
                        </p>
                      )}
                    </form>
                  </Col>
                  <Col md="4" className="text-right d-none d-md-block" style={{ color: "#9a9a9a", fontSize: "0.78rem" }}>
                    24/7 Autonomous · Telegram-ready
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          {[
            { label: "Clips Generated", value: fmtNum(totalClips), icon: "icon-scissors", cls: "icon-info" },
            { label: "Posts Published",  value: fmtNum(totalPosts),  icon: "icon-send",     cls: "icon-success" },
            { label: "Total Views",      value: fmtNum(totalViews),  icon: "icon-world",    cls: "icon-warning" },
            { label: "Avg Viral Score",  value: `${avgScore}%`,      icon: "icon-trophy",   cls: "icon-danger" },
          ].map((s) => (
            <Col lg="3" md="6" key={s.label}>
              <Card className="card-stats">
                <CardBody>
                  <Row>
                    <Col xs="5">
                      <div className={`info-icon text-center ${s.cls}`}>
                        <i className={`tim-icons ${s.icon}`} />
                      </div>
                    </Col>
                    <Col xs="7">
                      <div className="numbers">
                        <p className="card-category">{s.label}</p>
                        <CardTitle tag="h3">{s.value}</CardTitle>
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>

        <Row>
          <Col xs="12">
            <Card className="card-chart">
              <CardHeader>
                <Row>
                  <Col className="text-left" sm="6">
                    <h5 className="card-category">Performance Over Time</h5>
                    <CardTitle tag="h2">Clip &amp; Engagement Growth</CardTitle>
                  </Col>
                  <Col sm="6">
                    <ButtonGroup className="btn-group-toggle float-right" data-toggle="buttons">
                      {["clips", "views", "engagement"].map((v) => (
                        <Button key={v} tag="label" size="sm" color="info"
                          className={classNames("btn-simple", { active: chartView === v })}
                          onClick={() => setChartView(v)}>
                          <span className="d-none d-sm-block" style={{ textTransform: "capitalize" }}>{v}</span>
                        </Button>
                      ))}
                    </ButtonGroup>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line data={chartClipsOverTime[chartView]} options={chartClipsOverTime.options} />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Posts by Platform</h5>
                <CardTitle tag="h3"><i className="tim-icons icon-send text-primary" /> Distribution</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Bar data={chartPostsPerPlatform.data} options={chartPostsPerPlatform.options} />
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Platform Views</h5>
                <CardTitle tag="h3"><i className="tim-icons icon-world text-warning" /> {fmtNum(totalViews)} total</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line data={chartPlatformViews.data} options={chartPlatformViews.options} />
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card>
              <CardHeader><CardTitle tag="h4">Platform Reach</CardTitle></CardHeader>
              <CardBody>
                {analytics?.by_platform && Object.keys(analytics.by_platform).length > 0
                  ? Object.entries(analytics.by_platform).map(([pl, data]) => (
                      <div className="mb-3" key={pl}>
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>
                            {pl.charAt(0).toUpperCase() + pl.slice(1)}
                          </span>
                          <span style={{ color: "#fff", fontWeight: 600 }}>{fmtNum(data.views)}</span>
                        </div>
                        <Progress value={Math.min(data.posts * 10, 100)} color="info" style={{ height: 6 }} />
                      </div>
                    ))
                  : ["TikTok", "Instagram", "YouTube"].map((pl) => (
                      <div className="mb-3" key={pl}>
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>{pl}</span>
                          <span style={{ color: "#9a9a9a" }}>—</span>
                        </div>
                        <Progress value={0} color="info" style={{ height: 6 }} />
                      </div>
                    ))}
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Recent Processing Jobs</CardTitle>
                <p className="card-category">Live — refreshes every 5s</p>
              </CardHeader>
              <CardBody>
                {jobs.length === 0 ? (
                  <p style={{ color: "#9a9a9a", textAlign: "center", padding: "2rem 0" }}>
                    No jobs yet. Paste a YouTube link above or send one to your Telegram bot!
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table tablesorter">
                      <thead className="text-primary">
                        <tr>
                          <th>Job ID</th>
                          <th>Video Title</th>
                          <th>Status</th>
                          <th>Clips Found</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job) => (
                          <tr key={job.id}>
                            <td style={{ fontFamily: "monospace", color: "#9a9a9a", fontSize: "0.8rem" }}>JOB-{job.id}</td>
                            <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {job.title || job.url}
                            </td>
                            <td>
                              <Badge color={STATUS_COLOR[job.status] || "secondary"} pill>
                                {STATUS_LABEL[job.status] || job.status}
                              </Badge>
                            </td>
                            <td>{job.clips_count}</td>
                            <td style={{ color: "#9a9a9a", fontSize: "0.82rem" }}>
                              {job.created_at ? new Date(job.created_at).toLocaleString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default Dashboard;
