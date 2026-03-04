import React from "react";
import classNames from "classnames";
import { Line, Bar } from "react-chartjs-2";
import {
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Input,
  InputGroup,
  InputGroupAddon,
  Badge,
  Progress,
} from "reactstrap";

import {
  chartClipsOverTime,
  chartPlatformViews,
  chartEngagement,
  chartPostsPerPlatform,
} from "variables/charts.js";

const recentJobs = [
  {
    id: "JOB-001",
    title: "Top 10 Goals of the Season",
    platform: "YouTube",
    status: "done",
    clips: 7,
    posted: 5,
    score: 94,
  },
  {
    id: "JOB-002",
    title: "Ronaldo Skills Compilation",
    platform: "YouTube",
    status: "processing",
    clips: 4,
    posted: 0,
    score: 87,
  },
  {
    id: "JOB-003",
    title: "Best Saves 2024",
    platform: "YouTube",
    status: "captioning",
    clips: 6,
    posted: 0,
    score: 91,
  },
  {
    id: "JOB-004",
    title: "Messi Dribbles Masterclass",
    platform: "YouTube",
    status: "scheduled",
    clips: 5,
    posted: 5,
    score: 96,
  },
];

const statusColor = {
  done: "success",
  processing: "info",
  captioning: "warning",
  scheduled: "primary",
};

const statusLabel = {
  done: "Done",
  processing: "AI Processing",
  captioning: "Adding Captions",
  scheduled: "Scheduled",
};

function Dashboard() {
  const [ytUrl, setYtUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [chartView, setChartView] = React.useState("clips");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setYtUrl("");
      setTimeout(() => setSubmitted(false), 3500);
    }, 1800);
  };

  return (
    <>
      <div className="content">
        {/* Hero submit card */}
        <Row>
          <Col xs="12">
            <Card style={{ background: "linear-gradient(135deg, #1a1e34 0%, #1d2035 100%)", border: "1px solid rgba(29,140,248,0.25)" }}>
              <CardBody>
                <Row className="align-items-center">
                  <Col md="7">
                    <h2 className="mb-1" style={{ color: "#fff", fontWeight: 700 }}>
                      AI Clipping Agent
                    </h2>
                    <p className="mb-3" style={{ color: "#9a9a9a", fontSize: "0.95rem" }}>
                      Paste a YouTube link — the agent finds viral clips, adds captions,
                      tracks faces, and schedules posts to TikTok, Instagram &amp; YouTube automatically.
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
                          <Button
                            color="info"
                            type="submit"
                            disabled={submitting || !ytUrl.trim()}
                            style={{ minWidth: 130 }}
                          >
                            {submitting ? (
                              <span>
                                <i className="tim-icons icon-refresh-02 spin-icon" /> Analyzing...
                              </span>
                            ) : (
                              <span>
                                <i className="tim-icons icon-triangle-right-17" /> Process
                              </span>
                            )}
                          </Button>
                        </InputGroupAddon>
                      </InputGroup>
                      {submitted && (
                        <p className="mt-2 mb-0" style={{ color: "#00d6b4", fontSize: "0.85rem" }}>
                          <i className="tim-icons icon-check-2" /> Job queued! AI is analyzing your video for viral clips.
                        </p>
                      )}
                    </form>
                  </Col>
                  <Col md="5" className="text-center d-none d-md-block">
                    <div style={{ fontSize: "5rem", opacity: 0.15, lineHeight: 1 }}>&#9654;</div>
                    <div className="mt-2" style={{ color: "#9a9a9a", fontSize: "0.78rem" }}>
                      Powered by AI · 24/7 Autonomous
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Stats row */}
        <Row>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-info">
                      <i className="tim-icons icon-scissors" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Clips Generated</p>
                      <CardTitle tag="h3">1,247</CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-success">
                      <i className="tim-icons icon-send" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Posts Published</p>
                      <CardTitle tag="h3">893</CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-warning">
                      <i className="tim-icons icon-world" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Total Views</p>
                      <CardTitle tag="h3">4.2M</CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-danger">
                      <i className="tim-icons icon-trophy" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Avg Viral Score</p>
                      <CardTitle tag="h3">88%</CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Main chart */}
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
                    <ButtonGroup
                      className="btn-group-toggle float-right"
                      data-toggle="buttons"
                    >
                      <Button
                        tag="label"
                        className={classNames("btn-simple", { active: chartView === "clips" })}
                        color="info"
                        size="sm"
                        onClick={() => setChartView("clips")}
                      >
                        <span className="d-none d-sm-block">Clips</span>
                        <span className="d-block d-sm-none"><i className="tim-icons icon-scissors" /></span>
                      </Button>
                      <Button
                        tag="label"
                        className={classNames("btn-simple", { active: chartView === "views" })}
                        color="info"
                        size="sm"
                        onClick={() => setChartView("views")}
                      >
                        <span className="d-none d-sm-block">Views</span>
                        <span className="d-block d-sm-none"><i className="tim-icons icon-world" /></span>
                      </Button>
                      <Button
                        tag="label"
                        className={classNames("btn-simple", { active: chartView === "engagement" })}
                        color="info"
                        size="sm"
                        onClick={() => setChartView("engagement")}
                      >
                        <span className="d-none d-sm-block">Engagement</span>
                        <span className="d-block d-sm-none"><i className="tim-icons icon-heart-2" /></span>
                      </Button>
                    </ButtonGroup>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line
                    data={chartClipsOverTime[chartView]}
                    options={chartClipsOverTime.options}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Platform breakdown + recent jobs */}
        <Row>
          <Col lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Posts by Platform</h5>
                <CardTitle tag="h3">
                  <i className="tim-icons icon-send text-primary" /> Distribution
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Bar
                    data={chartPostsPerPlatform.data}
                    options={chartPostsPerPlatform.options}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Platform Views</h5>
                <CardTitle tag="h3">
                  <i className="tim-icons icon-world text-warning" /> 4.2M total
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line
                    data={chartPlatformViews.data}
                    options={chartPlatformViews.options}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Platform Reach</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>TikTok</span>
                    <span style={{ color: "#fff", fontWeight: 600 }}>2.1M</span>
                  </div>
                  <Progress value={72} color="info" style={{ height: 6 }} />
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>Instagram</span>
                    <span style={{ color: "#fff", fontWeight: 600 }}>1.3M</span>
                  </div>
                  <Progress value={45} color="success" style={{ height: 6 }} />
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>YouTube</span>
                    <span style={{ color: "#fff", fontWeight: 600 }}>780K</span>
                  </div>
                  <Progress value={27} color="warning" style={{ height: 6 }} />
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>Telegram</span>
                    <span style={{ color: "#fff", fontWeight: 600 }}>120K</span>
                  </div>
                  <Progress value={12} color="danger" style={{ height: 6 }} />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Recent jobs */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Recent Processing Jobs</CardTitle>
                <p className="card-category">Latest YouTube videos submitted to the agent</p>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <table className="table tablesorter">
                    <thead className="text-primary">
                      <tr>
                        <th>Job ID</th>
                        <th>Video Title</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>Clips Found</th>
                        <th>Posted</th>
                        <th className="text-center">Viral Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentJobs.map((job) => (
                        <tr key={job.id}>
                          <td style={{ fontFamily: "monospace", color: "#9a9a9a", fontSize: "0.8rem" }}>{job.id}</td>
                          <td>{job.title}</td>
                          <td>
                            <i className="tim-icons icon-triangle-right-17 text-danger" style={{ marginRight: 4 }} />
                            {job.platform}
                          </td>
                          <td>
                            <Badge color={statusColor[job.status]} pill>
                              {statusLabel[job.status]}
                            </Badge>
                          </td>
                          <td>{job.clips}</td>
                          <td>{job.posted}</td>
                          <td className="text-center">
                            <span
                              style={{
                                color: job.score >= 90 ? "#00d6b4" : job.score >= 80 ? "#1f8ef1" : "#ff8d72",
                                fontWeight: 700,
                              }}
                            >
                              {job.score}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default Dashboard;
