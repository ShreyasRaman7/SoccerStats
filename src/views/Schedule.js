import React from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Badge,
  Button,
  Input,
  FormGroup,
  Label,
} from "reactstrap";

const schedule = [
  {
    id: 1,
    time: "Today 10:00 AM",
    platform: "TikTok",
    clip: "Insane volley from 35 yards",
    caption: "Insane volley from 35 yards 🔥 #football #goals",
    status: "live",
    views: "142K",
  },
  {
    id: 2,
    time: "Today 2:00 PM",
    platform: "Instagram",
    clip: "Insane volley from 35 yards",
    caption: "Insane volley from 35 yards 🔥 #football #goals",
    status: "live",
    views: "58K",
  },
  {
    id: 3,
    time: "Today 6:00 PM",
    platform: "TikTok",
    clip: "He just walked past 4 defenders",
    caption: "He just walked past 4 defenders like they weren't there 😤",
    status: "live",
    views: "98K",
  },
  {
    id: 4,
    time: "Tomorrow 9:00 AM",
    platform: "TikTok",
    clip: "That reflex save should be illegal",
    caption: "That reflex save should be illegal 🧤 #goalkeeper",
    status: "scheduled",
    views: "—",
  },
  {
    id: 5,
    time: "Tomorrow 1:00 PM",
    platform: "Instagram",
    clip: "Nobody does it like Leo",
    caption: "Nobody does it like Leo. NOBODY. 🐐 #Messi",
    status: "scheduled",
    views: "—",
  },
  {
    id: 6,
    time: "Tomorrow 5:00 PM",
    platform: "YouTube",
    clip: "Nobody does it like Leo",
    caption: "Nobody does it like Leo. NOBODY. 🐐 #Messi",
    status: "scheduled",
    views: "—",
  },
  {
    id: 7,
    time: "Thu Mar 6, 10:00 AM",
    platform: "TikTok",
    clip: "CR7 elastico that broke the internet",
    caption: "CR7 elastico that broke the internet 💫 #Ronaldo",
    status: "pending",
    views: "—",
  },
  {
    id: 8,
    time: "Thu Mar 6, 3:00 PM",
    platform: "YouTube",
    clip: "He just walked past 4 defenders",
    caption: "He just walked past 4 defenders like they weren't there 😤",
    status: "pending",
    views: "—",
  },
];

const platformColor = {
  TikTok: "danger",
  Instagram: "warning",
  YouTube: "info",
};

const statusColor = {
  live: "success",
  scheduled: "primary",
  pending: "secondary",
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const slots = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"];

const calendarData = {
  Mon: { "10 AM": "TikTok", "2 PM": "Instagram", "6 PM": "TikTok" },
  Tue: { "10 AM": "YouTube", "4 PM": "TikTok" },
  Wed: { "12 PM": "Instagram", "6 PM": "YouTube" },
  Thu: { "10 AM": "TikTok", "3 PM": "YouTube" },
  Fri: { "8 AM": "Instagram", "2 PM": "TikTok", "8 PM": "YouTube" },
  Sat: { "12 PM": "TikTok" },
  Sun: {},
};

function Schedule() {
  const [autoSchedule, setAutoSchedule] = React.useState(true);
  const [tiktokEnabled, setTiktokEnabled] = React.useState(true);
  const [igEnabled, setIgEnabled] = React.useState(true);
  const [ytEnabled, setYtEnabled] = React.useState(true);
  const [postsPerDay, setPostsPerDay] = React.useState("3");

  return (
    <>
      <div className="content">
        {/* Schedule summary */}
        <Row>
          <Col lg="3" md="6">
            <Card className="card-stats">
              <CardBody>
                <Row>
                  <Col xs="5">
                    <div className="info-icon text-center icon-success">
                      <i className="tim-icons icon-check-2" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Live Today</p>
                      <CardTitle tag="h3">3</CardTitle>
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
                    <div className="info-icon text-center icon-primary">
                      <i className="tim-icons icon-time-alarm" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Scheduled</p>
                      <CardTitle tag="h3">3</CardTitle>
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
                      <i className="tim-icons icon-calendar-60" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">This Week</p>
                      <CardTitle tag="h3">8</CardTitle>
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
                    <div className="info-icon text-center icon-info">
                      <i className="tim-icons icon-send" />
                    </div>
                  </Col>
                  <Col xs="7">
                    <div className="numbers">
                      <p className="card-category">Platforms Active</p>
                      <CardTitle tag="h3">3</CardTitle>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          {/* Weekly calendar */}
          <Col lg="8">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Weekly Posting Calendar</CardTitle>
                <p className="card-category">Mar 3 – Mar 9, 2026</p>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <table className="table" style={{ fontSize: "0.8rem", tableLayout: "fixed" }}>
                    <thead className="text-primary">
                      <tr>
                        <th style={{ width: 55 }}>Time</th>
                        {days.map((d) => (
                          <th key={d} className="text-center">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot) => (
                        <tr key={slot}>
                          <td style={{ color: "#9a9a9a", fontSize: "0.75rem", verticalAlign: "middle" }}>{slot}</td>
                          {days.map((day) => {
                            const platform = calendarData[day]?.[slot];
                            return (
                              <td key={day} className="text-center" style={{ verticalAlign: "middle", padding: "6px 4px" }}>
                                {platform ? (
                                  <Badge
                                    color={platformColor[platform]}
                                    pill
                                    style={{ fontSize: "0.65rem", display: "block" }}
                                  >
                                    {platform}
                                  </Badge>
                                ) : (
                                  <span style={{ color: "#333" }}>·</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Auto-schedule settings */}
          <Col lg="4">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Auto-Schedule Settings</CardTitle>
              </CardHeader>
              <CardBody>
                <FormGroup>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Label style={{ color: "#fff", marginBottom: 0 }}>Auto-Schedule</Label>
                    <Button
                      size="sm"
                      color={autoSchedule ? "success" : "secondary"}
                      onClick={() => setAutoSchedule(!autoSchedule)}
                    >
                      {autoSchedule ? "ON" : "OFF"}
                    </Button>
                  </div>
                  <p style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>
                    Agent automatically picks best times based on platform analytics.
                  </p>
                </FormGroup>

                <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <FormGroup>
                  <Label style={{ color: "#fff" }}>Posts Per Day</Label>
                  <Input
                    type="select"
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(e.target.value)}
                    style={{ background: "#1d1f33", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  >
                    <option value="1">1 post / day</option>
                    <option value="2">2 posts / day</option>
                    <option value="3">3 posts / day</option>
                    <option value="5">5 posts / day</option>
                    <option value="custom">Custom</option>
                  </Input>
                </FormGroup>

                <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <Label style={{ color: "#fff", marginBottom: 10, display: "block" }}>Active Platforms</Label>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span style={{ color: "#9a9a9a" }}>
                    <Badge color="danger" pill className="mr-2">TK</Badge>TikTok
                  </span>
                  <Button
                    size="sm"
                    color={tiktokEnabled ? "success" : "secondary"}
                    onClick={() => setTiktokEnabled(!tiktokEnabled)}
                  >
                    {tiktokEnabled ? "ON" : "OFF"}
                  </Button>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span style={{ color: "#9a9a9a" }}>
                    <Badge color="warning" pill className="mr-2">IG</Badge>Instagram
                  </span>
                  <Button
                    size="sm"
                    color={igEnabled ? "success" : "secondary"}
                    onClick={() => setIgEnabled(!igEnabled)}
                  >
                    {igEnabled ? "ON" : "OFF"}
                  </Button>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span style={{ color: "#9a9a9a" }}>
                    <Badge color="info" pill className="mr-2">YT</Badge>YouTube
                  </span>
                  <Button
                    size="sm"
                    color={ytEnabled ? "success" : "secondary"}
                    onClick={() => setYtEnabled(!ytEnabled)}
                  >
                    {ytEnabled ? "ON" : "OFF"}
                  </Button>
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <Button color="info" block>
                  <i className="tim-icons icon-check-2 mr-1" /> Save Settings
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Upcoming posts table */}
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">Upcoming Posts</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <table className="table tablesorter">
                    <thead className="text-primary">
                      <tr>
                        <th>#</th>
                        <th>Scheduled Time</th>
                        <th>Platform</th>
                        <th>Clip</th>
                        <th>Caption</th>
                        <th>Status</th>
                        <th className="text-center">Views</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((item) => (
                        <tr key={item.id}>
                          <td style={{ color: "#9a9a9a", fontSize: "0.8rem" }}>{item.id}</td>
                          <td style={{ color: "#9a9a9a", fontSize: "0.85rem" }}>{item.time}</td>
                          <td>
                            <Badge color={platformColor[item.platform]} pill>
                              {item.platform}
                            </Badge>
                          </td>
                          <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.clip}
                          </td>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.82rem", color: "#9a9a9a" }}>
                            {item.caption}
                          </td>
                          <td>
                            <Badge color={statusColor[item.status]} pill>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="text-center" style={{ fontWeight: 600 }}>{item.views}</td>
                          <td className="text-right">
                            <Button color="link" size="sm" style={{ color: "#9a9a9a", padding: "0 4px" }}>
                              <i className="tim-icons icon-pencil" />
                            </Button>
                            <Button color="link" size="sm" style={{ color: "#ff6b6b", padding: "0 4px" }}>
                              <i className="tim-icons icon-simple-remove" />
                            </Button>
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

export default Schedule;
