import React, { Component } from 'react';
import View from '../View';

export default class HelpView extends Component {
  state = {
    content: false
  };
  timer = null;

  constructor(props) {
    super(props);
    this.change = this.change.bind(this);
    this.ref_ = this.ref_.bind(this);
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      this.change();
    }, 200);
  }

  componentWillUnmount() {
    this.timer && clearInterval(this.timer);
  }

  change() {
    this.setState({
      content: !this.state.content
    });
  }

  ref_() {
    this.change();
  }

  render() {
    return <View ref={this.ref_}>{this.state.content ? <View /> : null}</View>;
  }
}
