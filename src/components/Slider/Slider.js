// @flow
import React, { useRef, useState, useEffect } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

import * as actions from '../../actions';
import { COLORS } from '../../constants';
import { clamp, normalize } from '../../utils';
import useBoundingBox from '../../hooks/bounding-box.hook';

import RectangularHandle from '../RectangularHandle';
import Decorations from './Decorations';

type Props = {
  value: number,
  updateValue: (num: number) => void,
  width: number,
  height: number,
  numOfNotches?: number,
  handleWidth?: number,
  handleHeight?: number,
  isDisabled: boolean,
};

const HANDLE_BUFFER = 2;

// All sliders expect values to be between 0 and 100
const min = 0;
const max = 100;

const Slider = ({
  value,
  updateValue,
  width,
  height,
  numOfNotches = 18,
  handleWidth = 30,
  handleHeight = 21,
  isDisabled,
  isMachineBroken,
  breakMachineWithKeyboard,
}: Props) => {
  const handleRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const [animateTransition, setAnimateTransition] = useState(true);

  const [sliderRef, sliderBoundingBox] = useBoundingBox();

  const updatePosition = ev => {
    if (!sliderBoundingBox || isDisabled) {
      return;
    }

    const deltaY = ev.clientY - sliderBoundingBox.top;
    const value = clamp(deltaY / height, 0, 1);

    const normalizedValue = normalize(value, 0, 1, max, min);

    updateValue(normalizedValue);
  };

  useEffect(
    () => {
      if (!dragging || !document.body || !sliderBoundingBox) {
        return;
      }

      document.body.style.cursor = 'grabbing';

      const handleMouseUp = () => {
        setDragging(false);
        setAnimateTransition(true);
      };

      window.addEventListener('mouseup', handleMouseUp);

      window.addEventListener('mousemove', updatePosition);

      return () => {
        // $FlowIgnore
        document.body.style.cursor = null;

        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mousemove', updatePosition);
      };
    },
    [dragging]
  );

  const handleMarginLeft = (width - handleWidth) / 2;
  const handleMarginTop = -handleHeight / 2;

  const handleDisplacement = normalize(value, min, max, height, 0);
  const handleColor = COLORS.pink[300];

  return (
    <Wrapper ref={sliderRef} style={{ width, height }} onClick={updatePosition}>
      <Decorations numOfNotches={numOfNotches} />

      <HandleWrapper
        ref={handleRef}
        tabIndex={isDisabled ? -1 : undefined}
        onMouseDown={ev => {
          ev.stopPropagation();

          if (isDisabled) {
            return;
          }

          setAnimateTransition(false);

          setDragging(true);
        }}
        onKeyDown={ev => {
          // Allow keyboard navigators to break out of the range by 20% in
          // either direction :o this is an easter egg!
          let hasBrokenOutOfRange = false;

          if (ev.key === 'ArrowUp') {
            if (value < 120) {
              const newValue = value + 2;
              updateValue(newValue);

              hasBrokenOutOfRange = newValue > 100;
            }
          } else if (ev.key === 'ArrowDown') {
            if (value > -20) {
              const newValue = value - 2;
              updateValue(newValue);

              hasBrokenOutOfRange = newValue < 0;
            }
          }

          if (!isMachineBroken && hasBrokenOutOfRange) {
            // Mark the machine as "broken".
            // This just displays a toast for the user, and keeps track of
            // that state, so that we don't keep showing them the toast.
            breakMachineWithKeyboard(handleRef.current);
          }
        }}
        style={{
          width: handleWidth,
          height: handleHeight,
          left: handleMarginLeft,
          top: handleMarginTop,
          // Invisible padding, to make it easier to click
          padding: HANDLE_BUFFER,
          // We have to undo that padding in transform: translate, as well as apply
          // the displacement.
          transform: `translate(
            ${-HANDLE_BUFFER}px,
            ${handleDisplacement - HANDLE_BUFFER}px
          )`,
          transition: `transform ${animateTransition ? 250 : 0}ms`,
          cursor: isDisabled ? 'not-allowed' : dragging ? 'grabbing' : 'grab',
        }}
      >
        <RectangularHandle
          width={handleWidth}
          height={handleHeight}
          color={handleColor}
        />
      </HandleWrapper>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: relative;
  border-radius: 3px;
`;

const HandleWrapper = styled.button`
  position: absolute;
  border: none;
  background: transparent;
  /*
    The wrapper is given some padding, so that user clicks don't have to be
    perfect. It's an invisible barrier around the handle.
    We want this barrier to be considered as part of the width, otherwise it'll
    shrink the actual handle! So we need to ditch border-box
  */
  box-sizing: content-box;

  &:focus:not(.focus-visible) {
    outline: none;
  }
`;

const mapStateToProps = state => {
  const isMachineBroken = state.machine.hasBeenBroken;

  return { isMachineBroken };
};

const mapDispatchToProps = {
  breakMachineWithKeyboard: actions.breakMachineWithKeyboard,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Slider);
