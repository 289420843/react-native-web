/**
 * Copyright (c) 2016-present, Nicolas Gallagher.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import debounce from 'debounce';
import StyleSheet from '../StyleSheet';
import View from '../View';
import ViewPropTypes from '../ViewPropTypes';
import React, { Component } from 'react';
import { bool, func, number } from 'prop-types';
import ReactDOM from 'react-dom';

const normalizeScrollEvent = e => ({
  nativeEvent: {
    contentOffset: {
      get x() {
        return e.target.scrollLeft;
      },
      get y() {
        return e.target.scrollTop;
      }
    },
    contentSize: {
      get height() {
        return e.target.scrollHeight;
      },
      get width() {
        return e.target.scrollWidth;
      }
    },
    layoutMeasurement: {
      get height() {
        return e.target.offsetHeight;
      },
      get width() {
        return e.target.offsetWidth;
      }
    }
  },
  timeStamp: Date.now()
});

/**
 * Encapsulates the Web-specific scroll throttling and disabling logic
 */
export default class ScrollViewBase extends Component<*> {
  _viewRef: View;

  static propTypes = {
    ...ViewPropTypes,
    onMomentumScrollBegin: func,
    onMomentumScrollEnd: func,
    onScroll: func,
    onScrollBeginDrag: func,
    onScrollEndDrag: func,
    onTouchMove: func,
    onWheel: func,
    removeClippedSubviews: bool,
    scrollEnabled: bool,
    scrollEventThrottle: number,
    showsHorizontalScrollIndicator: bool,
    showsVerticalScrollIndicator: bool
  };

  static defaultProps = {
    scrollEnabled: true,
    scrollEventThrottle: 0
  };

  _debouncedOnScrollEnd = debounce(this._handleScrollEnd, 100);
  _state = { isScrolling: false, scrollLastTick: 0 };

  setNativeProps(props: Object) {
    if (this._viewRef) {
      this._viewRef.setNativeProps(props);
    }
  }

  render() {
    const {
      scrollEnabled,
      style,
      children,
      /* eslint-disable */
      alwaysBounceHorizontal,
      alwaysBounceVertical,
      automaticallyAdjustContentInsets,
      bounces,
      bouncesZoom,
      canCancelContentTouches,
      centerContent,
      contentInset,
      contentInsetAdjustmentBehavior,
      contentOffset,
      decelerationRate,
      directionalLockEnabled,
      endFillColor,
      indicatorStyle,
      keyboardShouldPersistTaps,
      maximumZoomScale,
      minimumZoomScale,
      onMomentumScrollBegin,
      onMomentumScrollEnd,
      onScrollBeginDrag,
      onScrollEndDrag,
      overScrollMode,
      pinchGestureEnabled,
      removeClippedSubviews,
      scrollEventThrottle,
      scrollIndicatorInsets,
      scrollPerfTag,
      scrollsToTop,
      showsHorizontalScrollIndicator,
      showsVerticalScrollIndicator,
      snapToInterval,
      snapToAlignment,
      zoomScale,
      /* eslint-enable */
      ...other
    } = this.props;
    let newChildren = children;
    const topPlaceholder = (<div style={{width:'1px',height:'1px'}}/>);
    if(React.isValidElement(children)){
      const contentChildren  = children.props.children;
      if(React.Children.count(contentChildren)===1){
        newChildren = React.cloneElement(children,{},[topPlaceholder,contentChildren,topPlaceholder])
      }else if(React.Children.count(contentChildren)>1){
        newChildren = React.cloneElement(children,{},[topPlaceholder,...contentChildren,topPlaceholder])
      }
    }
    other.children = newChildren;
    return (
      <View
        {...other}
        onScroll={this._handleScroll}
        onTouchMove={this._createPreventableScrollHandler(this.props.onTouchMove)}
        onTouchStart={this._onTouchStart(this.props.onTouchStart)}
        onWheel={this._createPreventableScrollHandler(this.props.onWheel)}
        ref={this._setViewRef}
        style={StyleSheet.compose(style, !scrollEnabled && styles.scrollDisabled)}
      />
    );
  }

  _onTouchStart = (handler: Function) => {
    return (e: Object) => {
      this._changeTop();
      handler(e);
    };
  };

  _createPreventableScrollHandler = (handler: Function) => {
    return (e: Object) => {
      if (this.props.scrollEnabled) {
        if (handler) {
          handler(e);
        }
      } else {
        // To disable scrolling in all browsers except Chrome
        e.preventDefault();
      }
    };
  };

  _handleScroll = (e: Object) => {
    e.persist();
    e.stopPropagation();
    const { scrollEventThrottle } = this.props;
    // A scroll happened, so the scroll bumps the debounce.
    this._debouncedOnScrollEnd(e);
    if (this._state.isScrolling) {
      // Scroll last tick may have changed, check if we need to notify
      if (this._shouldEmitScrollEvent(this._state.scrollLastTick, scrollEventThrottle)) {
        this._handleScrollTick(e);
      }
    } else {
      // Weren't scrolling, so we must have just started
      this._handleScrollStart(e);
    }
    this._changeTop();
  };

  _handleScrollStart(e: Object) {
    this._state.isScrolling = true;
    this._state.scrollLastTick = Date.now();
  }

  _handleScrollTick(e: Object) {
    const { onScroll } = this.props;
    this._state.scrollLastTick = Date.now();
    if (onScroll) {
      onScroll(normalizeScrollEvent(e));
    }
  }

  _handleScrollEnd(e: Object) {
    const { onScroll } = this.props;
    this._state.isScrolling = false;
    if (onScroll) {
      onScroll(normalizeScrollEvent(e));
    }
  }

  _setViewRef = (element: View) => {
    this._viewRef = element;
    this._viewDom = ReactDOM.findDOMNode(this._viewRef);
    this._changeTop();
  };

  _changeTop = () => {
    const top = this._viewDom.scrollTop;
    const totalScroll = this._viewDom.scrollHeight;
    const currentScroll = top + this._viewDom.offsetHeight;
    if (top === 0) {
      this._viewDom.scrollTop = 1;
    } else if (currentScroll === totalScroll) {
      this._viewDom.scrollTop = top - 1;
    }
  };

  _shouldEmitScrollEvent(lastTick: number, eventThrottle: number) {
    const timeSinceLastTick = Date.now() - lastTick;
    return eventThrottle > 0 && timeSinceLastTick >= eventThrottle;
  }
}

// Chrome doesn't support e.preventDefault in this case; touch-action must be
// used to disable scrolling.
// https://developers.google.com/web/updates/2017/01/scrolling-intervention
const styles = StyleSheet.create({
  scrollDisabled: {
    touchAction: 'none'
  }
});
