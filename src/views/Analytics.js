import React from "react";
import classNames from "classnames";
import { Line, Bar } from "react-chartjs-2";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  ButtonGroup,
  Badge,
  Progress,
} from "reactstrap";

import {
  chartEngagement,
  chartPostsPerPlatform,
  chartPlatformViews,
  chartClipsOverTime,
} from "variables/charts.js";

const topClips = [
  { title: "Nobody does it like Leo. NOBODY.", platform: "TikTok", views: "310K", likes: "42K", shares: "18K", score: 98 },
  { title: "Insane volley from 35 yards", platform: "TikTok", views: "142K", likes: "19K", shares: "8K", score: 96 },
  { title: "He just walked past 4 defenders", platform: "YouTube", views: "98K", likes: "12K", shares: "5K", score: 93 },
  { title: "That reflex save should be illegal", platform: "Instagram", views: "87K", likes: "14K", shares: "6K", score: 94 },
  { title: "CR7 elastico that broke the internet", platform: "TikTok", views: "76K", likes: "11K", shares: "4K", score: 91 },
];

const platformColor = {
  TikTok: "danger",
  Instagram: "warning",
  YouTube: "info",
};

function Analytics() {
  const [period, setPeriod] = React.useState("week");

  return (
    <>
      <div className="content">
        {/* KPI row */}
        <Row>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-info">
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
                <p className="card-category mt-2 mb-0" style={{ fontSize: "0.78rem" }}>
                  <span className="text-success">+24%</span> vs last month
                </p>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-warning">
                      <i className="tim-icons icon-heart-2" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Total Likes</p>
                      <CardTitle tag="h3">318K</CardTitle>
                    </div>
                  </Col>
                </Row>
                <p className="card-category mt-2 mb-0" style={{ fontSize: "0.78rem" }}>
                  <span className="text-success">+18%</span> vs last month
                </p>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-success">
                      <i className="tim-icons icon-refresh-02" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Shares</p>
                      <CardTitle tag="h3">142K</CardTitle>
                    </div>
                  </Col>
                </Row>
                <p className="card-category mt-2 mb-0" style={{ fontSize: "0.78rem" }}>
                  <span className="text-success">+31%</span> vs last month
                </p>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-danger">
                      <i className="tim-icons icon-single-02" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">New Followers</p>
                      <CardTitle tag="h3">28K</CardTitle>
                    </div>
                  </Col>
                </Row>
                <p className="card-category mt-2 mb-0" style={{ fontSize: "0.78rem" }}>
                  <span className="text-success">+9%</span> vs last month
                </p>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Main views chart */}
        <Row>
          <Col xs="12">
            <Card className="card-chart">
              <CardHeader>
                <Row>
                  <Col className="text-left" sm="6">
                    <h5 className="card-category">Cross-Platform</h5>
                    <CardTitle tag="h2">Views &amp; Engagement Over Time</CardTitle>
                  </Col>
                  <Col sm="6" className="text-right">
                    <ButtonGroup className="btn-group-toggle" data-toggle="buttons">
                      <Button
                        tag="label"
                        size="sm"
                        color="info"
                        className={classNames("btn-simple", { active: period === "week" })}
                        onClick={() => setPeriod("week")}
                      >
                        7D
                      </Button>
                      <Button
                        tag="label"
                        size="sm"
                        color="info"
                        className={classNames("btn-simple", { active: period === "month" })}
                        onClick={() => setPeriod("month")}
                      >
                        30D
                      </Button>
                      <Button
                        tag="label"
                        size="sm"
                        color="info"
                        className={classNames("btn-simple", { active: period === "year" })}
                        onClick={() => setPeriod("year")}
                      >
                        1Y
                      </Button>
                    </ButtonGroup>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line
                    data={chartClipsOverTime["views"]}
                    options={chartClipsOverTime.options}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Platform breakdown + engagement */}
        <Row>
          <Col lg="6">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">By Platform</h5>
                <CardTitle tag="h3">
                  <i className="tim-icons icon-send text-primary" /> Posts per Platform
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
          <Col lg="6">
            <Card className="card-chart">
              <CardHeader>
                <h5 className="card-category">Engagement Rate</h5>
                <CardTitle tag="h3">
                  <i className="tim-icons icon-heart-2 text-warning" /> Weekly Trend
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="chart-area">
                  <Line
                    data={chartEngagement.data}
                    options={chartEngagement.options}
                  />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Platform share breakdown */}
        <Row>
          <Col lg="4">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Platform Share</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ color: "#fff" }}>
                      <Badge color="danger" pill className="mr-2">TK</Badge>TikTok
                    </span>
                    <span style={{ color: "#fff", fontWeight: 700 }}>50%</span>
                  </div>
                  <Progress value={50} color="danger" style={{ height: 8 }} />
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ color: "#fff" }}>
                      <Badge color="warning" pill className="mr-2">IG</Badge>Instagram
                    </span>
                    <span style={{ color: "#fff", fontWeight: 700 }}>31%</span>
                  </div>
                  <Progress value={31} color="warning" style={{ height: 8 }} />
                </div>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ color: "#fff" }}>
                      <Badge color="info" pill className="mr-2">YT</Badge>YouTube
                    </span>
                    <span style={{ color: "#fff", fontWeight: 700 }}>19%</span>
                  </div>
                  <Progress value={19} color="info" style={{ height: 8 }} />
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <div className="text-center mt-3">
                  <p style={{ color: "#9a9a9a", fontSize: "0.8rem", marginBottom: 4 }}>Best Performing Platform</p>
                  <Badge color="danger" style={{ fontSize: "0.95rem", padding: "6px 14px" }}>TikTok</Badge>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Top performing clips */}
          <Col lg="8">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Top Performing Clips</CardTitle>
                <p className="card-category">All time, sorted by views</p>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <table className="table tablesorter">
                    <thead className="text-primary">
                      <tr>
                        <th>#</th>
                        <th>Clip</th>
                        <th>Platform</th>
                        <th className="text-center">Views</th>
                        <th className="text-center">Likes</th>
                        <th className="text-center">Shares</th>
                        <th className="text-center">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topClips.map((clip, i) => (
                        <tr key={i}>
                          <td style={{ color: "#9a9a9a" }}>{i + 1}</td>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {clip.title}
                          </td>
                          <td>
                            <Badge color={platformColor[clip.platform]} pill>
                              {clip.platform}
                            </Badge>
                          </td>
                          <td className="text-center" style={{ fontWeight: 700 }}>{clip.views}</td>
                          <td className="text-center" style={{ color: "#9a9a9a" }}>{clip.likes}</td>
                          <td className="text-center" style={{ color: "#9a9a9a" }}>{clip.shares}</td>
                          <td className="text-center">
                            <span style={{ color: clip.score >= 95 ? "#00d6b4" : "#1f8ef1", fontWeight: 700 }}>
                              {clip.score}%
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

export default Analytics;
